import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
export const generatePublicId = customAlphabet(alphabet, 8);
