function generateCorrelationToken() {
    return Math.random().toString(36).slice(2);
}
export { generateCorrelationToken };
export default {
    generateCorrelationToken
};
