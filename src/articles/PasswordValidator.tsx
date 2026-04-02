import CodeBlock from "@/components/layouts/CodeBlock";
// import React from "react";

// Article metadata
export const articleMeta = {
    id: "password-validator",
    title: "Password Protected Validator",
    subtitle: "Secure funds on-chain using a cryptographic hash and a cleartext password",
    date: "2025-02-15T10:00:00.000Z",
    readTime: "7 min read",
    tags: ["plutus", "cardano", "validator", "security", "cryptography"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=5",
    },
};

export default function PasswordValidatorArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module PasswordValidator where

import qualified Plutus.V2.Ledger.Api as PlutusV2
import           PlutusTx             (BuiltinData, compile)
import           PlutusTx.Builtins    (BuiltinByteString)
import           PlutusTx.Prelude     (Bool, traceIfFalse, sha2_256, (==), ($))
import           Prelude              (IO)
import           Utilities            (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- The Datum is our "Lock": It stores the SHA2-256 hash of the secret password.
-- The Redeemer is our "Key": It is the actual, unhashed cleartext password.

{-# INLINABLE mkPasswordValidator #-}
mkPasswordValidator :: BuiltinByteString -> BuiltinByteString -> PlutusV2.ScriptContext -> Bool
mkPasswordValidator expectedHash cleartextPassword _ctx =
    traceIfFalse "Incorrect password! Access denied." checkPassword
  where
    -- We hash the provided cleartext password and see if it perfectly matches
    -- the hashed password that was permanently locked into the UTxO's datum.
    checkPassword :: Bool
    checkPassword = sha2_256 cleartextPassword == expectedHash

{-# INLINABLE wrappedMkVal #-}
wrappedMkVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedMkVal = wrapValidator mkPasswordValidator

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedMkVal ||])

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/password.plutus" validator
`;

    const bashCommands = `# 1. Choose a password and generate its SHA2-256 hash.
# Let's say our secret password is "SuperSecret123".
# In Hex, "SuperSecret123" is: 5375706572536563726574313233
# The SHA2-256 hash of that hex string is:
# d16af2eb6b9409addca5695ab21876fecd1b39dbb5f540b79edc4daea50ebcd1

# 2. Lock ADA at the contract address, using the HASH as the inline datum.
# We wrap it in a JSON object specifying it is a byte string.
$ cardano-cli conway transaction build \\
  --tx-in dummy_tx_hash_uuid_here_1111111111111111#0 \\
  --tx-out $(cat password.addr)+10000000 \\
  --tx-out-inline-datum-value '{"bytes": "d16af2eb6b9409addca5695ab21876fecd1b39dbb5f540b79edc4daea50ebcd1"}' \\
  --change-address addr_test1_dummy_address_here \\
  --testnet-magic 2 \\
  --out-file tx-lock-password.raw

$ cardano-cli conway transaction sign \\
  --tx-body-file tx-lock-password.raw \\
  --signing-key-file ../../../keys/payment.skey \\
  --testnet-magic 2 \\
  --out-file tx-lock-password.signed

$ cardano-cli conway transaction submit --tx-file tx-lock-password.signed

-------------------------------------------------------------------------

# 3. Spend the funds by providing the CLEARTEXT password in the redeemer.
# The redeemer JSON is the hex of "SuperSecret123" (5375706572536563726574313233).
$ cardano-cli conway transaction build \\
  --tx-in dummy_tx_hash_uuid_here_2222222222222222#0 \\
  --tx-in-script-file password.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"bytes": "5375706572536563726574313233"}' \\
  --tx-out addr_test1_dummy_receiver_address_here+8000000 \\
  --tx-in-collateral dummy_collateral_hash_uuid_here_33333333#0 \\
  --change-address addr_test1_dummy_address_here \\
  --testnet-magic 2 \\
  --out-file tx-spend-password.raw

$ cardano-cli conway transaction sign \\
  --tx-body-file tx-spend-password.raw \\
  --signing-key-file ../../../keys/payment.skey \\
  --testnet-magic 2 \\
  --out-file tx-spend-password.signed

$ cardano-cli conway transaction submit --tx-file tx-spend-password.signed
Transaction successfully submitted.
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                Imagine you want to leave a treasure chest of ADA for a friend, but you don't
                want to deal with multi-signature wallets or public keys. You just want to hand
                them a piece of paper with a secret password on it.
            </p>

            <p>
                The <strong>Password Protected Validator</strong> does exactly this. It locks funds
                using the principles of one-way cryptography. You give the contract the <em>hash</em>
                of your password (the Datum), and to unlock it, someone must provide the original
                <em>cleartext password</em> (the Redeemer).
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="PasswordValidator.hs"
            />
            <br />

            <h2 id="explanation">How It Works</h2>

            <h3>The One-Way Street of Cryptography</h3>

            <p className="pexplaination">
                Blockchains are public. If you wrote your secret password directly into the
                datum of a UTxO, anyone running a Cardano node could read it, copy it, and steal
                your funds before your friend ever got the chance!
            </p>

            <CodeBlock
                code={`checkPassword = sha2_256 cleartextPassword == expectedHash`}
                language="haskell"
                filename="The Golden Rule"
            />

            <p className="pexplaination">
                To solve this, we use a <strong>Cryptographic Hash Function</strong> like <code>sha2_256</code>.
                A hash function takes an input (like "SuperSecret123") and scrambles it into a
                seemingly random, fixed-length string of characters.
            </p>

            <p className="pexplaination">
                The magic of a cryptographic hash is that it is strictly a <em>one-way street</em>.
                It is mathematically impossible to look at the hash and guess the original password.
                Therefore, it is perfectly safe to store the hash publicly on the Cardano ledger as
                the Datum!
            </p>

            <h3>The Reveal (Redeemer)</h3>

            <p className="pexplaination">
                When your friend goes to spend the UTxO, they submit the actual, unhashed password
                in the Redeemer field. The Plutus validator takes that unhashed password, runs its
                own <code>sha2_256</code> function on it, and compares the result to the
                publicly visible hash in the Datum. If they match, the funds are released!
            </p>

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                When interacting with this contract via the Cardano CLI, you must remember that
                the CLI expects raw hex strings for its byte strings. You'll need to use a hex
                editor or a simple script to convert your text password into Hex, and then take
                the SHA2-256 hash of that Hex.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Password Execution Cycle"
            />

            <h3>Security Warning</h3>

            <p className="pexplaination">
                While this pattern is highly educational, there is a catch labeled
                <strong>"The Front-Running Problem"</strong>.
            </p>

            <p className="pexplaination pt-2">
                When you submit the spending transaction to the Cardano network, the cleartext
                password is required to be in the redeemer. This means for a few seconds before
                the block is minted, your cleartext password is floating around in the public Mempool!
                A sophisticated bot could spot your password, copy it, swap out your receiving
                address with their own, and race you to the block producer. This is why complex
                DeFi apps use digital signatures instead of symmetric passwords.
            </p>

            <br />
            <h2 id="summary">Summary</h2>

            <p>
                The Password Protected Validator is a beautiful, easy-to-understand demonstration
                of on-chain compute. It shows how Plutus scripts can run cryptographic functions
                like <code>sha2_256</code> directly inside the validator to enforce custom,
                creative spending conditions.
            </p>

        </div>
    );
}
