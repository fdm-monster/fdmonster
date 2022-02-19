const registerUserRules = {
    name: "required|string",
    username: "required|string",
    password: "required|string",
    password2: "required|string|same:password"
};
export { registerUserRules };
export default {
    registerUserRules
};
