import { OrgasmType, SexType } from "@prisma/client";
const OrgasmTypes = Object.keys(OrgasmType).map((x) => {
  return {
    value: x as OrgasmType,
    label: x.charAt(0) + x.slice(1).toLowerCase(),
  };
});
const SexTypes = Object.keys(SexType).map((x) => {
  return { value: x as SexType, label: x.charAt(0) + x.slice(1).toLowerCase() };
});

export { OrgasmTypes, SexTypes };
