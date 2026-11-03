// Shared by the landing FAQ section and its FAQPage JSON-LD, so they never drift.
export const FAQS: { q: string; a: string }[] = [
  {
    q: "How does Respondly connect to my Google Business Profile?",
    a: "You sign in with Google and choose your business location. Respondly uses Google's official Business Profile access to read reviews and post replies on your behalf, and you can disconnect it at any time from your account.",
  },
  {
    q: "When do replies go out?",
    a: "Once a day, in the evening (Sydney time). Respondly picks up the reviews that came in since the last run and posts the replies your rules call for.",
  },
  {
    q: "Will it reply to my old reviews?",
    a: "No. Only reviews posted after you connect are answered automatically, so your page never fills up with replies to old reviews overnight. Older reviews stay visible in your dashboard.",
  },
  {
    q: "Can I approve replies before they go live?",
    a: "Yes. Set any rule to manual and its replies wait as drafts until you read them and press publish. Other rules can stay fully automatic.",
  },
  {
    q: "What's the difference between Starter and Pro?",
    a: "Starter replies with templates you write, one for each star rating, filled in with the customer's name and your details. Pro adds AI that reads each review and writes a reply about what the customer actually said, in their language.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. Every plan starts with 90 days free. You add a card to start, and if you cancel before day 90 you won't be charged.",
  },
  {
    q: "Can I cancel any time?",
    a: "Yes, from the Subscription page in your account. Your plan keeps working until the end of the period you've already paid for.",
  },
];
