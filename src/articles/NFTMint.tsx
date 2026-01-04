import CodeBlock from "@/components/layouts/CodeBlock";
// import React from "react";

/* -------------------------------------------------------------------------- */
/*                                Article Meta                                 */
/* -------------------------------------------------------------------------- */

export const articleMeta = {
  id: "nft-mint-utxo",
  title: "NFT Minting with UTxO Consumption",
  subtitle: "Guaranteeing uniqueness using a one-time UTxO-based minting policy",
  date: "2025-01-15T10:00:00.000Z",
  readTime: "9 min read",
  tags: ["plutus", "cardano", "nft", "minting-policy", "utxo", "uniqueness"],
  author: {
    name: "Aman Kumar",
    avatar: "https://i.pravatar.cc/48?img=15",
  },
};

/* -------------------------------------------------------------------------- */
/*                               Article Body                                  */
/* -------------------------------------------------------------------------- */

export default function NFTMintArticle() {
  const plutusCode = `{-# LANGUAGE DataKinds         #-}
{-# LANGUAGE NoImplicitPrelude #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE TemplateHaskell   #-}

module NFT where

import qualified Data.ByteString.Char8      as BS8
import           Plutus.V1.Ledger.Value     (flattenValue)
import           Plutus.V2.Ledger.Api       (BuiltinData, CurrencySymbol,
                                             MintingPolicy,
                                             ScriptContext (scriptContextTxInfo),
                                             TokenName (unTokenName),
                                             TxId (TxId, getTxId),
                                             TxInInfo (txInInfoOutRef),
                                             TxInfo (txInfoInputs, txInfoMint),
                                             TxOutRef (TxOutRef, txOutRefId, txOutRefIdx),
                                             mkMintingPolicyScript)
import qualified PlutusTx
import           PlutusTx.Builtins.Internal (BuiltinByteString (BuiltinByteString))
import           PlutusTx.Prelude           (Bool (False), Eq ((==)), any,
                                             traceIfFalse, ($), (&&))
import           Prelude                    (IO, Show (show), String)
import           Text.Printf                (printf)
import           Utilities                  (bytesToHex, currencySymbol,
                                             wrapPolicy, writeCodeToFile,
                                             writePolicyToFile)

{-# INLINABLE mkNFTPolicy #-}
mkNFTPolicy :: TxOutRef -> TokenName -> () -> ScriptContext -> Bool
mkNFTPolicy oref tn () ctx = traceIfFalse "UTxO not consumed"   hasUTxO           &&
                             traceIfFalse "wrong amount minted" checkMintedAmount
  where
    info :: TxInfo
    info = scriptContextTxInfo ctx

    hasUTxO :: Bool
    hasUTxO = any (\\i -> txInInfoOutRef i == oref) $ txInfoInputs info

    checkMintedAmount :: Bool
    checkMintedAmount = case flattenValue (txInfoMint info) of
        [(_, tn'', amt)] -> tn'' == tn && amt == 1
        _                -> False

{-# INLINABLE mkWrappedNFTPolicy #-}
mkWrappedNFTPolicy :: BuiltinData -> BuiltinData -> BuiltinData -> BuiltinData -> BuiltinData -> ()
mkWrappedNFTPolicy tid ix tn' = wrapPolicy $ mkNFTPolicy oref tn
  where
    oref :: TxOutRef
    oref = TxOutRef
        (TxId $ PlutusTx.unsafeFromBuiltinData tid)
        (PlutusTx.unsafeFromBuiltinData ix)

    tn :: TokenName
    tn = PlutusTx.unsafeFromBuiltinData tn'

nftCode :: PlutusTx.CompiledCode (BuiltinData -> BuiltinData -> BuiltinData -> BuiltinData -> BuiltinData -> ())
nftCode = $$(PlutusTx.compile [|| mkWrappedNFTPolicy ||])

nftPolicy :: TxOutRef -> TokenName -> MintingPolicy
nftPolicy oref tn = mkMintingPolicyScript $
    nftCode
        \`PlutusTx.applyCode\` PlutusTx.liftCode (PlutusTx.toBuiltinData $ getTxId $ txOutRefId oref)
        \`PlutusTx.applyCode\` PlutusTx.liftCode (PlutusTx.toBuiltinData $ txOutRefIdx oref)
        \`PlutusTx.applyCode\` PlutusTx.liftCode (PlutusTx.toBuiltinData tn)


saveNFTCode :: IO ()
saveNFTCode = writeCodeToFile "assets/nft.plutus" nftCode

saveNFTPolicy :: TxOutRef -> TokenName -> IO ()
saveNFTPolicy oref tn = writePolicyToFile
    (printf "assets/nft-%s#%d-%s.plutus"
        (show $ txOutRefId oref)
        (txOutRefIdx oref) $
        tn') $
    nftPolicy oref tn
  where
    tn' :: String
    tn' = case unTokenName tn of
        (BuiltinByteString bs) -> BS8.unpack $ bytesToHex bs

nftCurrencySymbol :: TxOutRef -> TokenName -> CurrencySymbol
nftCurrencySymbol oref tn = currencySymbol $ nftPolicy oref tn

  `;

  const cliCommands = `# 1 Check wallet UTxOs
cardano-cli query utxo \\
  --address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca \\
  --testnet-magic 2

# 2 Get policy ID
cardano-cli conway transaction policyid \\
  --script-file nft.plutus

export NFT_POLICY_ID=a9b9d196bb9628851e4736b4906bb984da653b530fc5902c7fab80bc

# 3 Create redeemer
cat > redeemer.json <<EOF
{
  "constructor": 0,
  "fields": []
}
EOF

# 4 Mint the NFT (consumes a specific UTxO)
cardano-cli conway transaction build \\
  --tx-in 9bdebbbce37a76902cbb95073fb41f023fca72401650da7fd1b599f58a8b1f5c#1 \\
  --tx-in-collateral f5b4345ea271c03fe241f1914eacbd76e39f1f110eec8072c3d482dadf22d768#1 \\
  --mint "1 \${NFT_POLICY_ID}.46524545" \\
  --mint-script-file nft.plutus \\
  --mint-redeemer-file redeemer.json \\
  --change-address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca \\
  --testnet-magic 2 \\
  --out-file nft-mint.tx

cardano-cli conway transaction sign \\
  --tx-body-file nft-mint.tx \\
  --signing-key-file ../../../keys/payment.skey \\
  --testnet-magic 2 \\
  --out-file nft-mint.signed

cardano-cli conway transaction submit \\
  --tx-file nft-mint.signed \\
  --testnet-magic 2
`;

  return (
    <div className="article-content">
      <h2>Introduction</h2>

      <p>
        This article demonstrates a <strong>true NFT minting policy</strong> on
        Cardano using Plutus. The uniqueness of the NFT is enforced by
        <strong> consuming a specific UTxO</strong>, ensuring the token can only
        be minted once.
      </p>

      <h2>Core Idea</h2>

      <p className="pexplaination">
        An NFT is unique only if the ledger guarantees it can never be minted
        again. This policy achieves that by requiring a specific
        <code>TxOutRef</code> to be consumed during minting.
      </p>

      <h2>Plutus Minting Policy</h2>

      <CodeBlock
        code={plutusCode}
        language="haskell"
        filename="NFT.hs"
      />

      <h2>What the Policy Enforces</h2>

      <ul className="list-disc pl-6 space-y-2">
        <li>A specific UTxO <strong>must be consumed</strong></li>
        <li>Exactly <strong>1 token</strong> must be minted</li>
        <li>The token name must match exactly</li>
        <li>Any deviation causes validation failure</li>
      </ul>

      <h2>Execution Commands</h2>

      <CodeBlock
        code={cliCommands}
        language="bash"
        filename="NFT Minting (Testnet)"
      />

      <h2>Result</h2>

      <p className="pexplaination">
        After submission, the wallet contains exactly one NFT:
      </p>

      <CodeBlock
        code={`... + 1 a9b9d196bb9628851e4736b4906bb984da653b530fc5902c7fab80bc.46524545`}
        language="text"
        filename="Minted NFT Output"
      />

      <h2>Why This NFT Can Never Be Re-minted</h2>

      <p className="pexplaination">
        The UTxO referenced in the policy is permanently consumed during minting.
        Since UTxOs cannot be reused, the policy can never be satisfied again.
      </p>

      <p className="pexplaination">
        This is the most common and most secure pattern for NFT minting on
        Cardano.
      </p>

      <h2>Summary</h2>

      <p>
        This NFT minting policy enforces uniqueness through ledger mechanics,
        not off-chain promises. By tying minting rights to a single UTxO, the
        policy guarantees provable scarcity and one-time issuance.
      </p>
         <br />

            <p className="pexplaination">
        You can verify the transaction and UTxO details on{" "}
        <a
          href="https://preview.cardanoscan.io/transaction/fd67f8838ced808ed90c75b9f7a0d04634f8780a5db86df37c478f46b63dd9c3?tab=utxo"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800"
        >
          <span className="text-red-800 hover:text-blue-500">Cardanoscan (Preview Testnet)</span>
        </a>.
      </p>        
    </div>
  );
}
