# Arkado: Security & Scalability Action Items (Reminder Checklist)
**Status:** PENDING USER APPROVAL (पूछकर 'हाँ' या 'ना' के अनुसार अप्लाई या डिलीट करना है)  
**Created:** 2026-09-25

---

## 1. Security Vulnerabilities Found (सुरक्षा कमियां)

- [ ] **Task 1: `/api/products` से `drive_url` हटाना**
  - **फाइल:** `app/api/products/route.ts` (Line 35)
  - **समस्या:** यह एंडपॉइंट बिना किसी एडमिन चेक के `drive_url` पब्लिकली रिटर्न करता है।
  - **समाधान:** इसे केवल ऑथेंटिकेटेड एडमिन के लिए ही उपलब्ध कराया जाए, पब्लिक के लिए `drive_url` हाइड किया जाए।

- [ ] **Task 2: Manual UPI रिस्पॉन्स में `drive_url` का एक्सपोजर बंद करना**
  - **फाइल:** `app/api/orders/route.ts` (Line 161)
  - **समस्या:** छात्र जब UTR सबमिट करता है, तो `order: newOrder` में `drive_url` तुरंत चला जाता है, भले ही पेमेंट `pending` हो।
  - **समाधान:** पेंडिंग ऑर्डर्स में रिस्पॉन्स से `drive_url` को स्ट्रिप किया जाए ताकि केवल अप्रूवल के बाद ही लिंक मिले।

- [ ] **Task 3: `lib/admin-auth.ts` में Host Header स्पूफिंग फिक्स**
  - **फाइल:** `lib/admin-auth.ts` (Lines 8-12)
  - **समस्या:** `host.includes("localhost")` को केवल `NODE_ENV !== "production"` में ही अनुमति दी जाए ताकि प्रोडक्शन में हेडर स्पूफिंग न हो सके।

---

## 2. Phase 6: Syllabus & Question Bank Scalability (भविष्य के कार्य)

- [ ] **Task 4: Hierarchical Lazy-Loading for Syllabus & MCQs**
  - जब 3,300 MCQs और 11 विषयों के विस्तृत लेसन्स जुड़ेंगे, तो उन्हें एक साथ न लोड करके ऑन-डिमांड (चैप्टर-वाइज) लोड करना ताकि मोबाइल क्रैश न हो।
- [ ] **Task 5: Content Scraping Protection & Paywall Gating**
  - केवल पहला चैप्टर और 5-10 सवाल फ्री प्रीव्यू में देना, बाकी फुल लेसन्स को परचेज टोकन के पीछे सुरक्षित रखना।
- [ ] **Task 6: Local `arkado_syllebus` Sync Pipeline**
  - लोकल Python जनरेटेड JSON फाइल्स को क्लाउड में 1-क्लिक में सिंक करने का टूल बनाना।

---
*नोट: यह फाइल आपकी अनुमति के लिए सुरक्षित रखी गई है। जब आप कहेंगे, तभी इनमें से किसी को अप्लाई या डिलीट किया जाएगा।*
