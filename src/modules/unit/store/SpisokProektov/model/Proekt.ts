import type {Schema} from "@/api/types";

export type Proekt = Schema<"ProjectListItem">;
export type PolzovatelProekta = Schema<"ProjectUser">;
export type PeremenayaProekta = Schema<"ProjectVariable">;
export type NastroikiHukaProekta = Schema<"ProjectHookSettings">;

export default Proekt;
