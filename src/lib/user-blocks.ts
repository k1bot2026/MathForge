// Persistence layer for user-defined composite (subgraph) blocks.
//
// Storage: idb-keyval, store "mathforge:user-blocks".
// Each entry key is the block id (e.g. "user.my-chain"); value is a
// UserBlockRecord. Records are self-contained — they carry the full
// SubgraphPayload and port lists so they can be reconstructed without
// any other context.

import { createStore, del as idbDel, entries as idbEntries, set as idbSet } from "idb-keyval";
import { buildSubgraphDefinition } from "~/blocks/common/subgraph/definition";
import type { SubgraphPayload } from "~/blocks/common/subgraph/types";
import type { BlockRegistry } from "~/blocks/registry";
import type { InputPort, OutputPort } from "~/blocks/types";

const USER_BLOCKS_STORE = createStore("mathforge:user-blocks", "blocks");

export type UserBlockRecord = {
  id: string;
  label: string;
  version: number;
  subgraph: SubgraphPayload;
  inputPorts: ReadonlyArray<InputPort>;
  outputPorts: ReadonlyArray<OutputPort>;
};

/** Persists a user block record to IndexedDB. Overwrites existing entry for the same id. */
export async function saveUserBlock(record: UserBlockRecord): Promise<void> {
  await idbSet(record.id, record, USER_BLOCKS_STORE);
}

/** Loads all saved user block records from IndexedDB. */
export async function loadUserBlocks(): Promise<ReadonlyArray<UserBlockRecord>> {
  const all = await idbEntries<string, UserBlockRecord>(USER_BLOCKS_STORE);
  return all.map(([, v]) => v);
}

/** Removes a user block record from IndexedDB by id. */
export async function deleteUserBlock(id: string): Promise<void> {
  await idbDel(id, USER_BLOCKS_STORE);
}

/**
 * Loads all saved user blocks from IDB and registers them into the given
 * registry via registerOrReplace(). Call once at app startup, after the
 * built-in blocks are registered.
 */
export async function hydrateUserBlocks(registry: BlockRegistry): Promise<void> {
  const records = await loadUserBlocks();
  for (const record of records) {
    const def = buildSubgraphDefinition(
      record.id,
      record.label,
      record.subgraph,
      record.inputPorts,
      record.outputPorts,
      registry,
    );
    registry.registerOrReplace(def);
  }
}
