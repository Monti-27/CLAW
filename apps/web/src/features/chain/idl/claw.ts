/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/claw.json`.
 */
export type Claw = {
  address: "2gjcfh2Yp4iuD3TDPxtpRPY16L85nL9rQhoQM5YDYSLo";
  metadata: {
    name: "claw";
    version: "0.1.0";
    spec: "0.1.0";
    description: "CLAW: onchain claw machine on MagicBlock Ephemeral Rollups + VRF";
  };
  instructions: [
    {
      name: "claim";
      discriminator: [62, 198, 214, 193, 213, 159, 108, 210];
      accounts: [
        {
          name: "payer";
          docs: ["Anyone can crank a claim; the lamports only ever go to the player."];
          writable: true;
          signer: true;
        },
        {
          name: "player";
          writable: true;
        },
        {
          name: "machine";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [109, 97, 99, 104, 105, 110, 101];
              },
            ];
          };
        },
        {
          name: "vault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "machine";
              },
            ];
          };
        },
        {
          name: "round";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [114, 111, 117, 110, 100];
              },
              {
                kind: "account";
                path: "round.player";
                account: "round";
              },
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [];
    },
    {
      name: "delegateRound";
      discriminator: [4, 60, 37, 224, 19, 130, 106, 111];
      accounts: [
        {
          name: "player";
          writable: true;
          signer: true;
        },
        {
          name: "machine";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [109, 97, 99, 104, 105, 110, 101];
              },
            ];
          };
        },
        {
          name: "bufferRound";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [98, 117, 102, 102, 101, 114];
              },
              {
                kind: "account";
                path: "round";
              },
            ];
            program: {
              kind: "const";
              value: [
                25,
                9,
                133,
                250,
                190,
                92,
                120,
                178,
                157,
                139,
                239,
                21,
                11,
                25,
                218,
                15,
                183,
                114,
                132,
                246,
                21,
                215,
                228,
                34,
                150,
                214,
                111,
                53,
                20,
                144,
                8,
                248,
              ];
            };
          };
        },
        {
          name: "delegationRecordRound";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [100, 101, 108, 101, 103, 97, 116, 105, 111, 110];
              },
              {
                kind: "account";
                path: "round";
              },
            ];
            program: {
              kind: "account";
              path: "delegationProgram";
            };
          };
        },
        {
          name: "delegationMetadataRound";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97,
                ];
              },
              {
                kind: "account";
                path: "round";
              },
            ];
            program: {
              kind: "account";
              path: "delegationProgram";
            };
          };
        },
        {
          name: "round";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [114, 111, 117, 110, 100];
              },
              {
                kind: "account";
                path: "player";
              },
            ];
          };
        },
        {
          name: "validator";
          optional: true;
        },
        {
          name: "ownerProgram";
          address: "2gjcfh2Yp4iuD3TDPxtpRPY16L85nL9rQhoQM5YDYSLo";
        },
        {
          name: "delegationProgram";
          address: "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [];
    },
    {
      name: "fundVault";
      discriminator: [26, 33, 207, 242, 119, 108, 134, 73];
      accounts: [
        {
          name: "funder";
          writable: true;
          signer: true;
        },
        {
          name: "machine";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [109, 97, 99, 104, 105, 110, 101];
              },
            ];
          };
        },
        {
          name: "vault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "machine";
              },
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [
        {
          name: "lamports";
          type: "u64";
        },
      ];
    },
    {
      name: "grab";
      discriminator: [166, 108, 246, 251, 19, 39, 76, 111];
      accounts: [
        {
          name: "signer";
          docs: ["The player, or the session key they registered for this round."];
          writable: true;
          signer: true;
        },
        {
          name: "round";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [114, 111, 117, 110, 100];
              },
              {
                kind: "account";
                path: "round.player";
                account: "round";
              },
            ];
          };
        },
        {
          name: "oracleQueue";
          writable: true;
        },
        {
          name: "programIdentity";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [105, 100, 101, 110, 116, 105, 116, 121];
              },
            ];
          };
        },
        {
          name: "vrfProgram";
          address: "Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz";
        },
        {
          name: "slotHashes";
          address: "SysvarS1otHashes111111111111111111111111111";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [
        {
          name: "target";
          type: {
            option: {
              defined: {
                name: "grabTarget";
              };
            };
          };
        },
        {
          name: "clientSeed";
          type: {
            array: ["u8", 32];
          };
        },
      ];
    },
    {
      name: "gripCallback";
      docs: ["Called by MagicBlock VRF only."];
      discriminator: [198, 169, 40, 34, 164, 147, 220, 143];
      accounts: [
        {
          name: "vrfProgramIdentity";
          docs: [
            "Scoped VRF identity PDA, bound to this program. Its presence as a signer proves",
            "the callback was issued by the VRF program for this program.",
          ];
          signer: true;
        },
        {
          name: "round";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [114, 111, 117, 110, 100];
              },
              {
                kind: "account";
                path: "round.player";
                account: "round";
              },
            ];
          };
        },
      ];
      args: [
        {
          name: "randomness";
          type: {
            array: ["u8", 32];
          };
        },
        {
          name: "nonce";
          type: "u32";
        },
      ];
    },
    {
      name: "initializeMachine";
      discriminator: [61, 88, 18, 21, 148, 196, 155, 32];
      accounts: [
        {
          name: "authority";
          writable: true;
          signer: true;
        },
        {
          name: "machine";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [109, 97, 99, 104, 105, 110, 101];
              },
            ];
          };
        },
        {
          name: "vault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "machine";
              },
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [
        {
          name: "config";
          type: {
            defined: {
              name: "machineConfig";
            };
          };
        },
      ];
    },
    {
      name: "moveClaw";
      discriminator: [203, 22, 32, 45, 79, 124, 91, 113];
      accounts: [
        {
          name: "signer";
          docs: ["The player, or the session key they registered for this round."];
          signer: true;
        },
        {
          name: "round";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [114, 111, 117, 110, 100];
              },
              {
                kind: "account";
                path: "round.player";
                account: "round";
              },
            ];
          };
        },
      ];
      args: [
        {
          name: "xMm";
          type: "i16";
        },
        {
          name: "zMm";
          type: "i16";
        },
      ];
    },
    {
      name: "processUndelegation";
      discriminator: [196, 28, 41, 206, 48, 37, 51, 167];
      accounts: [
        {
          name: "baseAccount";
          writable: true;
        },
        {
          name: "buffer";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  117,
                  110,
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  101,
                  45,
                  98,
                  117,
                  102,
                  102,
                  101,
                  114,
                ];
              },
              {
                kind: "account";
                path: "baseAccount";
              },
            ];
            program: {
              kind: "const";
              value: [
                181,
                183,
                0,
                225,
                242,
                87,
                58,
                192,
                204,
                6,
                34,
                1,
                52,
                74,
                207,
                151,
                184,
                53,
                6,
                235,
                140,
                229,
                25,
                152,
                204,
                98,
                126,
                24,
                147,
                128,
                167,
                62,
              ];
            };
          };
        },
        {
          name: "payer";
          writable: true;
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [
        {
          name: "accountSeeds";
          type: {
            vec: "bytes";
          };
        },
      ];
    },
    {
      name: "settle";
      discriminator: [175, 42, 185, 87, 144, 131, 102, 212];
      accounts: [
        {
          name: "signer";
          docs: ["The player, or the session key they registered for this round."];
          writable: true;
          signer: true;
        },
        {
          name: "round";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [114, 111, 117, 110, 100];
              },
              {
                kind: "account";
                path: "round.player";
                account: "round";
              },
            ];
          };
        },
        {
          name: "magicProgram";
          address: "Magic11111111111111111111111111111111111111";
        },
        {
          name: "magicContext";
          writable: true;
          address: "MagicContext1111111111111111111111111111111";
        },
      ];
      args: [];
    },
    {
      name: "startRound";
      discriminator: [144, 144, 43, 7, 193, 42, 217, 215];
      accounts: [
        {
          name: "player";
          writable: true;
          signer: true;
        },
        {
          name: "machine";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [109, 97, 99, 104, 105, 110, 101];
              },
            ];
          };
        },
        {
          name: "vault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "machine";
              },
            ];
          };
        },
        {
          name: "round";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [114, 111, 117, 110, 100];
              },
              {
                kind: "account";
                path: "player";
              },
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [
        {
          name: "credits";
          type: "u8";
        },
        {
          name: "sessionKey";
          type: "pubkey";
        },
      ];
    },
    {
      name: "updateMachine";
      discriminator: [107, 38, 205, 118, 194, 110, 169, 123];
      accounts: [
        {
          name: "authority";
          signer: true;
          relations: ["machine"];
        },
        {
          name: "machine";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [109, 97, 99, 104, 105, 110, 101];
              },
            ];
          };
        },
      ];
      args: [
        {
          name: "config";
          type: {
            defined: {
              name: "machineConfig";
            };
          };
        },
      ];
    },
    {
      name: "withdrawVault";
      discriminator: [135, 7, 237, 120, 149, 94, 95, 7];
      accounts: [
        {
          name: "authority";
          writable: true;
          signer: true;
          relations: ["machine"];
        },
        {
          name: "machine";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [109, 97, 99, 104, 105, 110, 101];
              },
            ];
          };
        },
        {
          name: "vault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "machine";
              },
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [
        {
          name: "lamports";
          type: "u64";
        },
      ];
    },
  ];
  accounts: [
    {
      name: "machine";
      discriminator: [25, 102, 22, 13, 58, 243, 138, 79];
    },
    {
      name: "round";
      discriminator: [87, 127, 165, 51, 73, 78, 116, 174];
    },
  ];
  events: [
    {
      name: "gripResolved";
      discriminator: [246, 87, 50, 30, 95, 144, 22, 236];
    },
  ];
  errors: [
    {
      code: 6000;
      name: "invalidConfig";
      msg: "Machine config is out of range";
    },
    {
      code: 6001;
      name: "notAuthority";
      msg: "Only the machine authority can do this";
    },
    {
      code: 6002;
      name: "invalidCredits";
      msg: "Buy between 1 and the machine's max credits";
    },
    {
      code: 6003;
      name: "roundActive";
      msg: "A round is already open; settle it first";
    },
    {
      code: 6004;
      name: "roundNotOpen";
      msg: "This round is not open for play";
    },
    {
      code: 6005;
      name: "notAuthorized";
      msg: "Signer is neither the player nor the round's session key";
    },
    {
      code: 6006;
      name: "outOfBounds";
      msg: "Claw position is outside the playfield";
    },
    {
      code: 6007;
      name: "noCredits";
      msg: "No credits left; start a new round";
    },
    {
      code: 6008;
      name: "rollPending";
      msg: "A grip roll is still pending";
    },
    {
      code: 6009;
      name: "invalidPrizeProof";
      msg: "Prize is not part of this machine's pile";
    },
    {
      code: 6010;
      name: "invalidPrizeKind";
      msg: "Unknown prize kind";
    },
    {
      code: 6011;
      name: "wrongValidator";
      msg: "Round must be delegated to the machine's validator";
    },
    {
      code: 6012;
      name: "nothingToClaim";
      msg: "Nothing to claim";
    },
    {
      code: 6013;
      name: "vaultEmpty";
      msg: "Vault cannot cover this payout yet";
    },
    {
      code: 6014;
      name: "overflow";
      msg: "Math overflow";
    },
  ];
  types: [
    {
      name: "grabTarget";
      docs: ["The prize the claw is closing on, as laid out in the committed pile."];
      type: {
        kind: "struct";
        fields: [
          {
            name: "index";
            type: "u16";
          },
          {
            name: "kind";
            type: "u8";
          },
          {
            name: "xMm";
            type: "i16";
          },
          {
            name: "zMm";
            type: "i16";
          },
          {
            name: "proof";
            type: {
              vec: {
                array: ["u8", 32];
              };
            };
          },
        ];
      };
    },
    {
      name: "gripResolved";
      type: {
        kind: "struct";
        fields: [
          {
            name: "player";
            type: "pubkey";
          },
          {
            name: "nonce";
            type: "u32";
          },
          {
            name: "targetKind";
            type: "u8";
          },
          {
            name: "needPpm";
            type: "u32";
          },
          {
            name: "rollPpm";
            type: "u32";
          },
          {
            name: "won";
            type: "bool";
          },
          {
            name: "payout";
            type: "u64";
          },
        ];
      };
    },
    {
      name: "machine";
      type: {
        kind: "struct";
        fields: [
          {
            name: "authority";
            type: "pubkey";
          },
          {
            name: "config";
            type: {
              defined: {
                name: "machineConfig";
              };
            };
          },
          {
            name: "roundsStarted";
            docs: ["Lifetime counters, updated on the base layer."];
            type: "u64";
          },
          {
            name: "creditsSold";
            type: "u64";
          },
          {
            name: "paidOut";
            type: "u64";
          },
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "vaultBump";
            type: "u8";
          },
        ];
      };
    },
    {
      name: "machineConfig";
      docs: [
        "Everything a round needs to price a grab. Copied onto the round when it",
        "starts, so play on the rollup never depends on a second account.",
      ];
      type: {
        kind: "struct";
        fields: [
          {
            name: "playPrice";
            docs: ["Lamports per credit."];
            type: "u64";
          },
          {
            name: "payoutRatioBps";
            docs: ["Share of the play price returned on average, in basis points."];
            type: "u16";
          },
          {
            name: "boostBps";
            docs: ["Demo multiplier on the hold chance, in basis points (10_000 = none)."];
            type: "u32";
          },
          {
            name: "capPpm";
            docs: ["Highest hold chance any prize can have."];
            type: "u32";
          },
          {
            name: "floorPpm";
            docs: ["Lowest hold chance for a prize within reach."];
            type: "u32";
          },
          {
            name: "reachMm";
            docs: ["Horizontal reach of the claw, in millimetres."];
            type: "u16";
          },
          {
            name: "minX";
            docs: ["Player lane, in millimetres from the cabinet centre."];
            type: "i16";
          },
          {
            name: "maxX";
            type: "i16";
          },
          {
            name: "minZ";
            type: "i16";
          },
          {
            name: "maxZ";
            type: "i16";
          },
          {
            name: "homeX";
            docs: ["Where the claw parks (above the chute)."];
            type: "i16";
          },
          {
            name: "homeZ";
            type: "i16";
          },
          {
            name: "prizeValuesX100";
            docs: ["Prize value per kind, in hundredths of a play price."];
            type: {
              array: ["u32", 7];
            };
          },
          {
            name: "pileRoot";
            docs: ["Merkle root over every prize in the pile: (index, kind, x, z)."];
            type: {
              array: ["u8", 32];
            };
          },
          {
            name: "pileSeed";
            docs: ["Seed the clients build the same pile from."];
            type: "u32";
          },
          {
            name: "pileSize";
            type: "u16";
          },
          {
            name: "maxCredits";
            docs: ["Most credits one round can hold."];
            type: "u8";
          },
          {
            name: "validator";
            docs: ["Rollup validator rounds must be delegated to (default = any)."];
            type: "pubkey";
          },
        ];
      };
    },
    {
      name: "round";
      docs: [
        "One player's seat at the machine. Created and paid for on the base layer,",
        "delegated to the Ephemeral Rollup for play, committed back on settle.",
      ];
      type: {
        kind: "struct";
        fields: [
          {
            name: "player";
            type: "pubkey";
          },
          {
            name: "sessionKey";
            docs: ["Temporary key allowed to steer and grab for this round (default = none)."];
            type: "pubkey";
          },
          {
            name: "machine";
            type: "pubkey";
          },
          {
            name: "config";
            docs: ["Machine config at the moment the round started."];
            type: {
              defined: {
                name: "machineConfig";
              };
            };
          },
          {
            name: "status";
            type: {
              defined: {
                name: "roundStatus";
              };
            };
          },
          {
            name: "credits";
            type: "u8";
          },
          {
            name: "clawX";
            docs: ["Claw position in millimetres."];
            type: "i16";
          },
          {
            name: "clawZ";
            type: "i16";
          },
          {
            name: "moves";
            type: "u32";
          },
          {
            name: "nonce";
            docs: ["Counts grabs; ties each VRF callback to exactly one request."];
            type: "u32";
          },
          {
            name: "resolvedNonce";
            docs: ["Nonce of the last grab that has a result."];
            type: "u32";
          },
          {
            name: "requestedAt";
            type: "i64";
          },
          {
            name: "targetIndex";
            docs: ["Last grab: what the claw closed on and how it went."];
            type: "u16";
          },
          {
            name: "targetKind";
            type: "u8";
          },
          {
            name: "distanceMm";
            type: "u16";
          },
          {
            name: "needPpm";
            type: "u32";
          },
          {
            name: "rollPpm";
            type: "u32";
          },
          {
            name: "won";
            type: "bool";
          },
          {
            name: "randomness";
            type: {
              array: ["u8", 32];
            };
          },
          {
            name: "payoutPending";
            docs: ["Lamports owed to the player, paid by `claim` on the base layer."];
            type: "u64";
          },
          {
            name: "plays";
            type: "u32";
          },
          {
            name: "wins";
            type: "u32";
          },
          {
            name: "totalWon";
            type: "u64";
          },
          {
            name: "bump";
            type: "u8";
          },
        ];
      };
    },
    {
      name: "roundStatus";
      type: {
        kind: "enum";
        variants: [
          {
            name: "closed";
          },
          {
            name: "aiming";
          },
          {
            name: "rolling";
          },
        ];
      };
    },
  ];
  constants: [
    {
      name: "machineSeed";
      type: "bytes";
      value: "[109, 97, 99, 104, 105, 110, 101]";
    },
    {
      name: "roundSeed";
      type: "bytes";
      value: "[114, 111, 117, 110, 100]";
    },
    {
      name: "vaultSeed";
      type: "bytes";
      value: "[118, 97, 117, 108, 116]";
    },
  ];
};
