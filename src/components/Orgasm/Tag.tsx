import { type OrgasmType, type SexType } from "@prisma/client";

const TypeColours = [
  {
    type: "FULL",
    colour: "#8feb81",
  },
  {
    type: "RUINED",
    colour: "#f2bc57",
  },
  {
    type: "HANDSFREE",
    colour: "#ff8f8f",
  },
  {
    type: "ANAL",
    colour: "#d68bd1",
  },
];

const TypeTag = ({ label }: { label: OrgasmType }) => {
  const colour = TypeColours.find((type) => type.type === label)?.colour;

  return (
    <div
      className="rounded px-2 py-1 text-xs uppercase text-black "
      style={{ backgroundColor: colour }}
    >
      {label}
    </div>
  );
};

const SexColours = [
  {
    type: "SOLO",
    colour: "transparent",
    text: "white",
  },
  {
    type: "VIRTUAL",
    colour: "black",
    text: "white",
  },
  {
    type: "PHYSICAL",
    colour: "white",
    text: "black",
  },
];

const PartnerTag = ({ label }: { label: SexType }) => {
  const bgcolour = SexColours.find((type) => type.type === label)?.colour;
  const text = SexColours.find((type) => type.type === label)?.text;

  return (
    <div
      className="rounded px-2 py-1 text-xs uppercase"
      style={{ backgroundColor: bgcolour, color: text }}
    >
      {label}
    </div>
  );
};

export { TypeTag, TypeColours, PartnerTag, SexColours };
