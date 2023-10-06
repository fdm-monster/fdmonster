import { v4 as uuidv4 } from "uuid";
import { RefreshToken } from "@/models";
import { AuthenticationError, PasswordChangeRequiredError } from "@/exceptions/runtime.exceptions";
import { comparePasswordHash } from "@/utils/crypto.utils";
import { AppConstants } from "@/server.constants";
import { SettingsStore } from "@/state/settings.store";
import { LoggerService } from "@/handlers/logger";
import { UserService } from "@/services/authentication/user.service";
import { JwtService } from "@/services/authentication/jwt.service";
import { ILoggerFactory } from "@/handlers/logger-factory";

export class AuthService {
  private logger: LoggerService;
  private RefreshTokenModel = RefreshToken;
  private userService: UserService;
  private jwtService: JwtService;
  private settingsStore: SettingsStore;
  /**
   *  When users are blacklisted at runtime, this cache can make quick work of rejecting them
   */
  private blacklistedCache: Record<string, boolean> = {};

  /**
   * loginUser: starts new session: id-token, refresh, removing any old refresh
   * logoutUser: ends session, removes refresh token and blacklists userId
   * renewLoginByRefreshToken: renews session, reduces refresh attempts
   * addBlackListEntry: private, adds a blacklisted entry after logout
   * removeBlacklistEntry: private, removes a blacklisted entry
   * logoutUser
   * signJwtToken: private, purely signs a new jwt token
   */

  /**
   * cool features: faking other user logins (encapsulated login? Double login?)
   * registration link
   * loginUser: username/password based login
   * blacklist: forcing all existing refresh tokens and jwts to be rejected of that user until login
   * refreshAttempts => integer in setting with cap?
   */

  constructor({
    userService,
    jwtService,
    loggerFactory,
    settingsStore,
  }: {
    userService: UserService;
    jwtService: JwtService;
    loggerFactory: ILoggerFactory;
    settingsStore: SettingsStore;
  }) {
    this.userService = userService;
    this.jwtService = jwtService;
    this.logger = loggerFactory(AuthService.name);
    this.settingsStore = settingsStore;
  }

  async loginUser(username: string, password: string) {
    const userDoc = await this.userService.findRawByUsername(username);
    if (!userDoc) {
      throw new AuthenticationError("Login incorrect");
    }
    const result = comparePasswordHash(password, userDoc.passwordHash);
    if (!result) {
      throw new AuthenticationError("Login incorrect");
    }

    const userId = userDoc.id.toString();
    const token = await this.signJwtToken(userId);
    this.removeBlacklistEntry(userId);
    await this.deleteRefreshTokenByUserId(userId);
    const refreshToken = await this.createRefreshToken(userId);

    return {
      token,
      refreshToken,
    };
  }

  async logoutUserId(userId: string) {
    await this.deleteRefreshTokenAndBlacklistUserId(userId);
  }

  async logoutUserRefreshToken(refreshToken: string) {
    const userRefreshToken = await this.getValidRefreshToken(refreshToken);
    await this.deleteRefreshTokenAndBlacklistUserId(userRefreshToken.userId.toString());
  }

  async renewLoginByRefreshToken(refreshToken: string): Promise<string> {
    const userRefreshToken = await this.getValidRefreshToken(refreshToken, false);
    if (!userRefreshToken) {
      throw new AuthenticationError("The refresh token was invalid or expired, could not refresh user token");
    }

    const userId = userRefreshToken.userId.toString();
    const token = await this.signJwtToken(userId);
    await this.increaseRefreshTokenAttemptsUsed(userRefreshToken.refreshToken);
    return token;
  }

  isBlacklisted(userId: string) {
    return this.blacklistedCache[userId] === true;
  }

  private async signJwtToken(userId: string) {
    const user = await this.userService.getUser(userId);
    if (user.needsPasswordChange) {
      throw new PasswordChangeRequiredError();
    }
    return this.jwtService.signJwtToken(userId, user.username);
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const { refreshTokenExpiry } = await this.settingsStore.getCredentialSettings();
    const refreshToken = uuidv4();

    if (!refreshTokenExpiry) {
      this.logger.warn("Refresh token expiry not set in Settings:credentials, using default");
    }

    const timespan = refreshTokenExpiry ?? AppConstants.DEFAULT_REFRESH_TOKEN_EXPIRY;
    await this.RefreshTokenModel.create({
      userId,
      expiresAt: Date.now() + timespan,
      refreshToken,
      refreshAttemptsUsed: 0,
    });

    return refreshToken;
  }

  /**
   * @returns {Promise<RefreshToken|null>}
   */
  private async getValidRefreshToken(refreshToken: string, throwNotFoundError: boolean = true) {
    const userRefreshToken = await this.RefreshTokenModel.findOne({
      refreshToken,
    });
    if (!userRefreshToken) {
      if (throwNotFoundError) {
        throw new AuthenticationError("The refresh token was not found");
      }
      return null;
    }

    if (Date.now() > userRefreshToken.expiresAt) {
      await this.deleteRefreshTokenAndBlacklistUserId(userRefreshToken.userId.toString());
      throw new AuthenticationError("Refresh token expired, login required");
    }
    return userRefreshToken;
  }

  private async increaseRefreshTokenAttemptsUsed(refreshToken: string): Promise<void> {
    const { refreshTokenAttempts } = await this.settingsStore.getCredentialSettings();
    const userRefreshToken = await this.getValidRefreshToken(refreshToken);

    // If no attempts are set, then we don't care about attempts
    if (refreshTokenAttempts < 0) return;

    const attemptsUsed = userRefreshToken.refreshAttemptsUsed;
    if (attemptsUsed >= refreshTokenAttempts) {
      await this.deleteRefreshTokenAndBlacklistUserId(userRefreshToken.userId.toString());
      throw new AuthenticationError("Refresh token attempts exceeded, login required");
    }

    return this.RefreshTokenModel.findOneAndUpdate(
      {
        refreshToken,
      },
      {
        refreshAttemptsUsed: attemptsUsed + 1,
      },
      {
        new: true,
      }
    );
  }

  private async deleteRefreshTokenAndBlacklistUserId(userId: string): Promise<void> {
    if (!userId) {
      throw new AuthenticationError("No user id provided");
    }
    if (this.isBlacklisted(userId)) {
      throw new AuthenticationError("User is blacklisted, please login again");
    }

    await this.deleteRefreshTokenByUserId(userId);
    this.addBlackListEntry(userId);
  }

  private async deleteRefreshTokenByUserId(userId: string): Promise<void> {
    const result = await this.RefreshTokenModel.deleteMany({
      userId,
    });

    if (result.deletedCount) {
      this.logger.debug(`Removed ${result.deletedCount} login refresh tokens`);
    }
  }

  private async deleteRefreshToken(refreshToken: string): Promise<void> {
    const result = await this.RefreshTokenModel.deleteOne({
      refreshToken,
    });

    // TODO audit result
    if (result.deletedCount) {
      this.logger.debug(`Removed ${result.deletedCount} login refresh tokens`);
    }
  }

  private addBlackListEntry(userId: string) {
    this.blacklistedCache[userId] = true;
  }

  private removeBlacklistEntry(userId: string) {
    delete this.blacklistedCache[userId];
  }
}
