import red from "./pikmin-red.png";
import yellow from "./pikmin-yellow.jpg";
import blue from "./pikmin-blue.jpg";
import white from "./pikmin-white.png";
import rock from "./pikmin-rock.png";
import pink from "./pikmin-pink.jpg";
import trio from "./pikmin-trio.jpg";
import yellowBud from "./pikmin-yellow-bud.png";
import yellowLeaf from "./pikmin-yellow-leaf.png";
import yellowFlower from "./pikmin-yellow-flower.png";
import yellowP4 from "./pikmin-yellow-p4.webp";
import blueCherry from "./pikmin-blue-cherry.png";
import blueFlower from "./pikmin-blue-flower.webp";

export const PIKMIN = { red, yellow, blue, white, rock, pink, trio };

export const PIKMIN_LIST = [
  { key: "red", src: red, name: "Pikmin Rosso", transparent: true },
  { key: "yellow", src: yellow, name: "Pikmin Giallo", transparent: false },
  { key: "blue", src: blue, name: "Pikmin Blu", transparent: false },
  { key: "white", src: white, name: "Pikmin Bianco", transparent: true },
  { key: "rock", src: rock, name: "Pikmin Roccia", transparent: true },
  { key: "pink", src: pink, name: "Pikmin Rosa Volante", transparent: false },
  { key: "yellow_bud", src: yellowBud, name: "Pikmin Giallo Bocciolo", transparent: true },
  { key: "yellow_leaf", src: yellowLeaf, name: "Pikmin Giallo Foglia", transparent: true },
  { key: "yellow_flower", src: yellowFlower, name: "Pikmin Giallo Fiore", transparent: true },
  { key: "yellow_p4", src: yellowP4, name: "Pikmin Giallo Esploratore", transparent: true },
  { key: "blue_cherry", src: blueCherry, name: "Pikmin Blu Ciliegia", transparent: true },
  { key: "blue_flower", src: blueFlower, name: "Pikmin Blu Fiore", transparent: true },
] as const;
