import type { Transport } from "../transport.js";
import type { Person, PersonInput } from "../types.js";

export class PeopleModule {
  readonly #t: Transport;
  constructor(t: Transport) {
    this.#t = t;
  }

  list(query?: string): Promise<Person[]> {
    return this.#t.request<Person[]>(
      "people.list",
      query !== undefined ? { query } : {},
    );
  }

  create(data: PersonInput): Promise<Person> {
    return this.#t.request<Person>("people.create", { data });
  }

  update(id: string, data: Partial<PersonInput>): Promise<Person> {
    return this.#t.request<Person>("people.update", { id, data });
  }
}
