export const memoize = (fn: Function) => {
    const cache = {};
    const defaultKey = 'default';

    return (...args) => {
        const n = args[0] || defaultKey;
        if (n in cache) {
            return cache[n];
        } else {
            const result = fn(n === defaultKey ? undefined : n);
            cache[n] = result;
            return result;
        }
    };
};
