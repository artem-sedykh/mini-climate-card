// Reading the page while the frontend is navigating.
//
// Opening a more-info dialog pushes a history entry and closing it pops one,
// and a read that lands in that moment comes back as "Execution context was
// destroyed" rather than as an answer. That is a measurement to repeat, not a
// failure - the page is fine, the question was asked at the wrong instant.
//
// Anything else is thrown: a scenario that swallowed real errors here would
// report the page as empty instead of broken.
const TRANSIENT =
  /Execution context was destroyed|Cannot find context|Target closed|frame was detached/i;

export const isTransient = error => TRANSIENT.test(String((error && error.message) || error));

export const readPage = async (page, fn, argument, { attempts = 4, pause = 250 } = {}) => {
  let last;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await page.evaluate(fn, argument);
    } catch (error) {
      if (!isTransient(error)) throw error;
      last = error;
      await new Promise(resolve => setTimeout(resolve, pause));
    }
  }
  throw new Error(`the page kept navigating: ${last && last.message}`);
};
