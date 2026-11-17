/**
 * Shared legal text constants.
 *
 * Pure module — no Node.js imports, so it is safe to import from client
 * components (e.g. the /terms page) as well as server code.
 */

/** Fallback Terms of Service text used when admin settings don't define one. */
export const DEFAULT_TERMS_TEXT =
  "Arkado वेबसाइट का उपयोग करके आप निम्नलिखित शर्तों से सहमत होते हैं:\n1. इस प्लेटफ़ॉर्म पर उपलब्ध सभी अध्ययन सामग्री, प्रश्न बैंक और नोट्स केवल आपके व्यक्तिगत अध्ययन के लिए हैं।\n2. किसी भी सामग्री को पुनः बेचना, वाणिज्यिक उपयोग करना या सार्वजनिक रूप से इंटरनेट पर साझा करना कॉपीराइट कानून के तहत सख्त वर्जित है।\n3. कीमतें: सभी कीमतें भारतीय रुपये (INR) में हैं और सभी करों सहित हैं। वेबसाइट पर दिखाई गई कीमत ही भुगतान के समय लागू होती है।\n4. भुगतान और तुरंत डिलीवरी: भुगतान PhonePe (UPI, कार्ड, नेटबैंकिंग) के माध्यम से सुरक्षित रूप से होता है। भुगतान सफल होते ही आपके खरीदे गए material का download link तुरंत screen पर दिखाया जाता है और आपके email ID पर भी भेजा जाता है (Google Drive link के रूप में)। अगर किसी exam का material अभी तैयार नहीं है, तो link 1 घंटे के अंदर आपके email और WhatsApp पर भेज दिया जाएगा।\n5. खाता: खरीदारी बिना sign-in के guest के रूप में भी की जा सकती है। Sign-in करने पर आपके orders आपके dashboard में दिखते हैं, जहाँ से आप अपने download links कभी भी दोबारा पा सकते हैं।\n6. रद्दीकरण और रिफंड: डिजिटल उत्पाद होने के कारण भुगतान के बाद कोई रद्दीकरण (cancellation) window नहीं है — link मिलते ही order पूरा माना जाता है। रिफंड केवल दो स्थितियों में दिया जाता है: (a) एक ही course के लिए गलती से दो बार भुगतान हो गया हो, या (b) भुगतान के 24 घंटे के भीतर आपको link न मिला हो। इन स्थितियों में order ID और payment detail के साथ WhatsApp helpline 7852004401 या hello@arkado.store पर संपर्क करें — समस्या का समाधान 24–48 घंटे के अंदर किया जाएगा।\n7. किसी भी कानूनी विवाद के लिए क्षेत्राधिकार सरदारशहर (चूरू, राजस्थान) रहेगा।";

/**
 * Returns the effective Terms of Service text given the stored settings,
 * falling back to the default text.
 */
export function getEffectiveTermsText(policies?: { terms_of_service?: string } | null): string {
  const custom = policies?.terms_of_service?.trim();
  return custom || DEFAULT_TERMS_TEXT;
}
