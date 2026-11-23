import * as z from 'zod/mini';

/** The value declaration of a test element whose value the test does not look at. */
export const anyValue = () => z.unknown();
