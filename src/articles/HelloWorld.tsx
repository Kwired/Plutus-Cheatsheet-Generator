/* eslint-disable react-refresh/only-export-components */
import CodeBlock from "@/components/layouts/CodeBlock";
// import React from "react";

// Article metadata
export const articleMeta = {
    id: "hello-world-validator",
    title: "Hello World Validator",
    subtitle: "A Plutus script that only unlocks when greeted correctly",
    date: "2025-01-20T10:00:00.000Z",
    readTime: "6 min read",
    tags: ["plutus", "cardano", "validator", "basics", "hello-world"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=3"},
  plutusVersion: "V2",
  complexity: "Beginner",
  useCase: "NFTs"

};

export default function HelloWorldArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module HelloWorld where

import qualified Plutus.V2.Ledger.Api       as PlutusV2
import           PlutusTx                   (BuiltinData, compile)
import           PlutusTx.Builtins.Internal (BuiltinByteString)
import           PlutusTx.Prelude           (Bool, Eq ((==)), traceIfFalse, ($))
import           Prelude                    (IO)
import           Utilities                  (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- This validator expects a specific string (ByteString) as the redeemer to unlock funds.
--                    Datum         Redeemer             ScriptContext
mkHelloWorldValidator :: BuiltinData -> BuiltinByteString -> PlutusV2.ScriptContext -> Bool
mkHelloWorldValidator _ redeemer _ =
  traceIfFalse "Wrong greet! Expected 'Hello World!'" $ redeemer == "Hello World!"
{-# INLINABLE mkHelloWorldValidator #-}

wrappedMkVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedMkVal = wrapValidator mkHelloWorldValidator
{-# INLINABLE wrappedMkVal #-}

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedMkVal ||])

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/helloworld.plutus" validator
`;

    const executionCommands = `$ cardano-cli conway address build \\
  --payment-script-file helloworld.plutus \\
  --testnet-magic 2 \\
  --out-file helloworld.addr

$ cardano-cli query utxo \\
  --address addr_test1w7hatx6pxqwa75zqgmxskkjpnhup4ypsl3ppgzare25hyy6kapawh \\
  --testnet-magic 2
--------------------------------------------------------------------------------------
58c3e6bf364bb8c24432e7cc9bf0508d809ae97f65ee1b93a5927211c6d0beb5#0
9979316304 lovelace

# Locking ADA at the contract address
$ cardano-cli conway transaction build \\
  --tx-in 794586e4554da9542f1dc61a3baebf78d0abbe4c420d2e0b0f914f3f38b79096#0 \\
  --tx-out $(cat helloworld.addr)+5000000 \\
  --tx-out-inline-datum-value '{}' \\
  --change-address addr_test1fygpjk4fwx6x8xw2yesz3qwjm5ry3kvu6vajty4ntgsxgllg437fe \\
  --testnet-magic 2 \\
  --out-file tx-helloworld-lock.raw

Estimated transaction fee: 170425 Lovelace

$ cardano-cli conway transaction sign \\
  --tx-body-file tx-helloworld-lock.raw \\
  --signing-key-file ../../../keys/payment.skey \\
  --testnet-magic 2 \\
  --out-file tx-helloworld-lock.signed

$ cardano-cli conway transaction submit \\
  --tx-file tx-helloworld-lock.signed
Transaction successfully submitted.

$ cardano-cli query utxo --address $(cat helloworld.addr) --testnet-magic 2

# Attempting to spend the funds with the correct redeemer ("Hello World!")
# Plutus requires strings to be passed as hex-encoded ByteStrings.
# "Hello World!" in hex is 48656c6c6f20576f726c6421
$ cardano-cli conway transaction build \\
  --tx-in 8d1e8270b57baafcad80bd2e69365ea0f6dde5740e27c4d80cae9ed2c4a8ab1b#0 \\
  --tx-in-script-file helloworld.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"bytes": "48656c6c6f20576f726c6421"}' \\
  --tx-in-collateral 96451968975fa8e7a0b7398c2210130e6c11af1c04b968b37e81f3a5987c49a2#0 \\
  --change-address addr_test198cethfaw6esgxefxahhc7xgharw9mjtns6z4zg60he9u89fcsy2e \\
  --testnet-magic 2 \\
  --out-file tx-helloworld-spend.raw

Estimated transaction fee: 178942 Lovelace

$ cardano-cli conway transaction sign \\
  --tx-body-file tx-helloworld-spend.raw \\
  --signing-key-file ../../../keys/payment.skey \\
  --testnet-magic 2 \\
  --out-file tx-helloworld-spend.signed

$ cardano-cli conway transaction submit \\
  --tx-file tx-helloworld-spend.signed
Transaction successfully submitted.
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                The <strong>Hello World Validator</strong> is an excellent stepping stone
                right after learning the basic <em>Always Succeeds</em> and{" "}
                <em>Always Fails</em> contracts. It introduces the concept of actually
                reading and validating data passed into the script.
            </p>

            <p>
                Instead of unconditionally accepting or rejecting a transaction, this
                contract acts like a lock that requires a specific password. To spend the
                ADA locked inside, the user must provide the exact phrase{" "}
                <code>"Hello World!"</code> as the redeemer.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="HelloWorld.hs"
            />
            <br />

            <h2 id="explanation">Explanation</h2>

            <h3>Using BuiltinByteString</h3>

            <p className="pexplaination">
                In Plutus, we rarely use standard Haskell strings (<code>String</code>) on-chain because
                they are too heavy and inefficient to process. Instead, we use{" "}
                <code>BuiltinByteString</code>.
            </p>

            <p className="pexplaination">
                When the <code>OverloadedStrings</code> extension is enabled at the top of the file,
                it allows us to write normal string literals like <code>"Hello World!"</code> in our
                Haskell code, and the compiler automatically converts them into the highly efficient
                ByteString format required by the ledger.
            </p>

            <h3>Validator Logic</h3>

            <CodeBlock
                code={`mkHelloWorldValidator _ redeemer _ =
  traceIfFalse "Wrong greet! Expected 'Hello World!'" $ redeemer == "Hello World!"`}
                language="haskell"
                filename="HelloWorld Logic"
            />

            <p className="pexplaination">
                The logic here is very straightforward. We ignore the datum (the first
                underscore) and the script context (the second underscore). We only
                care about the middle parameter: the <code>redeemer</code>.
            </p>

            <p className="pexplaination">
                Using <code>traceIfFalse</code>, we check if the provided redeemer
                matches our required phrase. If it matches, the contract evaluates to{" "}
                <code>True</code> and the transaction succeeds. If it doesn't match, it
                returns <code>False</code>, rejects the transaction, and spits out our
                custom error message in the logs.
            </p>
            <br />

            <h2 id="execution">Execution</h2>

            <p className="pexplaination">
                When interacting with this contract using the Cardano CLI, the tricky
                part is how we pass strings to the blockchain. The CLI expects raw
                data to be provided in JSON format, usually mapped directly to Plutus
                core types.
            </p>

            <CodeBlock
                code={executionCommands}
                language="bash"
                filename="HelloWorld Execution (Testnet)"
            />

            <h3>Passing the password (Hex Encoding)</h3>

            <p className="pexplaination">
                Look closely at the spend command where we define the redeemer:
            </p>

            <CodeBlock
                code={`--tx-in-redeemer-value '{"bytes": "48656c6c6f20576f726c6421"}'`}
                language="bash"
                filename="CLI Argument"
            />

            <p className="pexplaination">
                Since our contract expects a <code>BuiltinByteString</code>, we must provide the
                redeemer as a JSON object with a <code>"bytes"</code> key. Furthermore, the
                actual text cannot be plain text; it <strong>must be hexadecimal encoded</strong>.
            </p>

            <p className="pexplaination">
                If you run the string "Hello World!" through a hex encoder, it translates to
                <code>48656c6c6f20576f726c6421</code>. If someone tries to spend the funds using a
                different hex string (like the hex for "Goodbye"), the transaction will instantly
                fail, protecting the ADA!
            </p>

            <br />
            <h2 id="summary">Summary</h2>

            <p>
                The <strong>Hello World Validator</strong> introduces basic conditions into
                Plutus scripts. It demonstrates how to securely parse information from the
                user (the redeemer) and how to handle strings efficiently on-chain using
                ByteStrings.
            </p>

        </div>
    );
}
