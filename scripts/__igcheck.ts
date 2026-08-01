import { checkInstagramAccount } from "@/lib/instagram";
(async () => {
  try {
    const a = await checkInstagramAccount();
    console.log("OK →", JSON.stringify(a));
  } catch (e: any) {
    console.log("FALHOU →", e.message);
  }
})().then(() => process.exit(0));
