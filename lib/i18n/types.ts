import type { dictionaries } from "./dictionaries";

export type Locale = "es" | "pt";
export type Dictionary = {
  readonly [Key in keyof typeof dictionaries.es]: string;
};
