/**
 * @typedef {object} ImageSession
 * @property {() => number} begin Starts an open operation and returns its ticket.
 * @property {(ticket: number) => boolean} isCurrent Whether no newer operation has begun.
 * @property {(ticket: number, image: {bitmap: ImageBitmap}) => boolean} commit Installs a decoded
 *   image if its ticket is current.
 * @property {{bitmap: ImageBitmap}|null} current The installed image, or null.
 */

/**
 * Tracks the image shown on the canvas so that overlapping opens resolve to the most recent
 * request and a failed render never discards the previous image.
 * @param {object} options Injected dependencies.
 * @param {(image: {bitmap: ImageBitmap}) => void} options.render Draws an image; may throw.
 * @returns {ImageSession} A new session with no image.
 * @throws {TypeError} When options or options.render is missing or of the wrong type.
 */
export function createImageSession(options) {
  if (options === null || typeof options !== 'object') {
    throw new TypeError('options must be an object.');
  }
  if (typeof options.render !== 'function') {
    throw new TypeError('options.render must be a function.');
  }
  const { render } = options;
  let latestTicket = 0;
  let current = null;

  return {
    begin: () => ++latestTicket,
    isCurrent: (ticket) => ticket === latestTicket,
    /**
     * Renders and installs a decoded image. A superseded ticket discards the image; a render
     * failure keeps the previous image and releases the new bitmap before rethrowing.
     * @param {number} ticket Ticket from begin().
     * @param {{bitmap: ImageBitmap}} image The decoded image.
     * @returns {boolean} True when the image was installed, false when it was superseded.
     * @throws {Error} Whatever the injected render throws.
     */
    commit(ticket, image) {
      if (ticket !== latestTicket) {
        image.bitmap.close();
        return false;
      }
      try {
        render(image);
      } catch (error) {
        image.bitmap.close();
        throw error;
      }
      current?.bitmap.close();
      current = image;
      return true;
    },
    get current() {
      return current;
    },
  };
}
