import red from "./pikmin-red.png";
import yellow from "./pikmin-yellow.jpg";
import blue from "./pikmin-blue.jpg";
import white from "./pikmin-white.png";
import rock from "./pikmin-rock.png";
import pink from "./pikmin-pink.jpg";
import trio from "./pikmin-trio.jpg";

export const PIKMIN = { red, yellow, blue, white, rock, pink, trio };

export const PIKMIN_LIST = [
  { key: "red", src: red, name: "Pikmin Rosso" },
  { key: "yellow", src: yellow, name: "Pikmin Giallo" },
  { key: "blue", src: blue, name: "Pikmin Blu" },
  { key: "white", src: white, name: "Pikmin Bianco" },
  { key: "rock", src: rock, name: "Pikmin Roccia" },
  { key: "pink", src: pink, name: "Pikmin Rosa Volante" },
] as const;
