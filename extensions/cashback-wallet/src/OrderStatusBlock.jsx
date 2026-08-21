import { render } from "preact";
import { useEffect, useState } from "preact/hooks";

export default function extension() {
  render(<Extension />, document.body);
}

function Extension() {
  const [cashbackBalance, setCashbackBalance] = useState(null);
const [error, setError] = useState("");
  useEffect(() => {
    async function loadCashback() {
      try {
        const token = await shopify.sessionToken.get();

        const response = await fetch(
          "https://vip-cashback.onrender.com/api/cashback/balance",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to load cashback balance."
          );
        }

        setCashbackBalance(data.cashbackBalance ?? 0);
      } catch (err) {
        console.error("Cashback wallet error:", err);

        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Unable to load your cashback balance.");
        }
      }
    }

    loadCashback();
  }, []);

  return (
    <s-page heading="Cashback Wallet">
      <s-section heading="My Cashback">
        {cashbackBalance === null && !error && (
          <s-text>Loading cashback balance...</s-text>
        )}

        {error && (
          <s-banner tone="critical">
            <s-text>{error}</s-text>
          </s-banner>
        )}

        {cashbackBalance !== null && error === null && (
          <s-stack direction="block" gap="base">
            <s-text>Available Cashback</s-text>

            <s-heading>
              ${Number(cashbackBalance).toFixed(2)}
            </s-heading>

            <s-text>
              This cashback can be used on eligible purchases.
            </s-text>
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}