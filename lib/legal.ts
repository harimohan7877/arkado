/**
 * Shared legal text constants.
 *
 * Pure module — no Node.js imports, so it is safe to import from client
 * components (e.g. the /terms page) as well as server code.
 */

/** Fallback Terms of Service text used when admin settings don't define one. */
export const DEFAULT_TERMS_TEXT =
  "Arkado वेबसाइट का उपयोग करके आप निम्नलिखित शर्तों से सहमत होते हैं:\n1. इस प्लेटफ़ॉर्म पर उपलब्ध सभी अध्ययन सामग्री, प्रश्न बैंक और नोट्स केवल आपके व्यक्तिगत अध्ययन के लिए हैं।\n2. किसी भी सामग्री को पुनः बेचना, वाणिज्यिक उपयोग करना या सार्वजनिक रूप से इंटरनेट पर साझा करना कॉपीराइट कानून के तहत सख्त वर्जित है।\n3. भुगतान के पश्चात डिजिटल सामग्री का लिंक आपके पंजीकृत WhatsApp या ईमेल पर भेजा जाता है।\n4. किसी भी कानूनी विवाद के लिए क्षेत्राधिकार सरदारशहर (चूरू, राजस्थान) रहेगा।";

/**
 * Returns the effective Terms of Service text given the stored settings,
 * falling back to the default text.
 */
export function getEffectiveTermsText(policies?: { terms_of_service?: string } | null): string {
  const custom = policies?.terms_of_service?.trim();
  return custom || DEFAULT_TERMS_TEXT;
}
