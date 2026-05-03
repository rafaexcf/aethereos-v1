import type { CloudDrivers } from "./drivers";

export interface MoveToTrashParams {
  drivers: CloudDrivers;
  userId: string;
  companyId: string;
  appId: string;
  itemType: string;
  itemName: string;
  itemData: Record<string, unknown>;
  originalId: string;
}

export async function moveToTrash(params: MoveToTrashParams): Promise<void> {
  const {
    drivers,
    userId,
    companyId,
    appId,
    itemType,
    itemName,
    itemData,
    originalId,
  } = params;
  await drivers.data.from("trash_items").insert({
    user_id: userId,
    company_id: companyId,
    app_id: appId,
    item_type: itemType,
    item_name: itemName,
    item_data: itemData,
    original_id: originalId,
  });
}
