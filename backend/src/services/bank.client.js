// Stand-in for the real CIB integration, which BE-3 owns.
// Keep these two signatures the same as the real ones so swapping over is
// just a change of import.
//
// Pass accountRef "DECLINE" to make a leg fail. Handy for testing.

export const authoriseFromAccount = async ({ accountRef, amount }) => {
  if (accountRef === "DECLINE") {
    return { approved: false, reason: "Insufficient funds" };
  }

  return {
    approved: true,
    providerRef: `MOCK-${Date.now()}-${Math.floor(Math.random() * 100000)}`
  };
};

export const reverseAuthorisation = async (providerRef) => {
  return { reversed: true, providerRef };
};
