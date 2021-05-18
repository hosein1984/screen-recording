export function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function promiseTimeout<T>(
  milliseconds: number,
  promise: Promise<T>,
  message = 'Timed out'
) {
  // Create a promise that rejects in <ms> milliseconds
  let timerId: ReturnType<typeof setTimeout>;
  const timeout: Promise<undefined> = new Promise((resolve, reject) => {
    timerId = setTimeout(() => reject(new Error(message)), milliseconds);
  });
  //
  const clearTimer = () => {
    if (timerId) {
      clearTimeout(timerId);
    }
  };
  // Returns a race between our timeout and the passed in promise
  return Promise.race([promise, timeout]).finally(clearTimer);
}

export function isPromise(obj: any) {
  return Promise.resolve(obj) == obj;
}

export const PromiseUtils = {
  delay,
  promiseTimeout,
  isPromise,
};
