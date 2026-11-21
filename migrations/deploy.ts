// `anchor deploy` only uploads the program. The machine itself (odds, lane,
// pile root, prize pool) is created from the web app at /admin, because its
// config is derived from the same constants the game renders with.

import * as anchor from "@anchor-lang/core";

module.exports = async (provider: anchor.AnchorProvider) => {
  anchor.setProvider(provider);
};
