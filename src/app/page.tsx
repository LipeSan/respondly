import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/Button";
import { Text } from "@/components/Text";
import { Analytics } from "@vercel/analytics/next"


export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Analytics/>
      {/* Navigation */}
      <nav className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="relative h-14 w-auto aspect-[3/1] mr-5">
                          <Image
                            src="/logo-header.png"
                            alt="Respondly"
                            fill
                            className="object-contain "
                            priority
                          />
                        </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost" className="!w-auto">
                  Log in
                </Button>
              </Link>
              <Link href="/register">
                <Button className="!w-auto">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden pt-16 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <Text variant="subtitle" className="mb-4">
              Automate your reputation management
            </Text>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 mb-6">
              Turn Google Reviews into{" "}
              <span className="text-blue-600">Growth</span>
            </h1>
            <p className="text-xl text-gray-500 mb-10 leading-relaxed">
              Respondly helps you manage, reply, and automate your Google Business reviews 
              with AI and smart rules. Boost your local SEO and save hours every week.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="w-full sm:w-auto">
                <Button className="w-full sm:!w-48 text-lg py-4">
                  Start for Free
                </Button>
              </Link>
              <Link href="#how-it-works" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:!w-48 text-lg py-4">
                  How it works
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Abstract Background Element */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full h-full z-0 opacity-30 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-20 right-10 w-72 h-72 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Text variant="h2" className="text-3xl mb-4">
              Everything you need to manage reviews
            </Text>
            <Text variant="body" className="max-w-2xl mx-auto text-lg">
              Powerful tools to help you stay on top of your customer feedback without the manual work.
            </Text>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <Text variant="h2" className="text-xl mb-3">Smart Auto-Replies</Text>
              <Text variant="body">
                Set up intelligent rules based on star ratings. Automatically thank 5-star reviewers or escalate low ratings to your team.
              </Text>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6 text-green-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <Text variant="h2" className="text-xl mb-3">AI-Powered Writing</Text>
              <Text variant="body">
                Let our AI draft personalized, human-like responses for you. Never sound robotic or repetitive again.
              </Text>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6 text-purple-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <Text variant="h2" className="text-xl mb-3">Template Library</Text>
              <Text variant="body">
                Create and manage a library of response templates. Ensure brand consistency across all your locations.
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div id="how-it-works" className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <Text variant="h2" className="text-3xl md:text-4xl mb-4">How it works</Text>
            <Text variant="body" className="max-w-2xl mx-auto text-lg">
              Get started in minutes and save hours every month.
            </Text>
          </div>

          <div className="space-y-24">
            {/* Step 1 */}
            <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24">
              <div className="w-full md:w-1/2 order-2 md:order-1 relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-purple-100 rounded-3xl transform -rotate-3 scale-105 opacity-50"></div>
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 relative">
                  {/* Illustration: Connect */}
                  <div className="flex items-center justify-center gap-6 md:gap-10 py-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-lg transform hover:scale-110 transition-transform">
                      R
                    </div>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full relative overflow-hidden">
                      <div className="absolute inset-0 bg-green-500 w-full animate-progress origin-left"></div>
                    </div>
                    <div className="w-20 h-20 bg-white border-2 border-gray-200 rounded-2xl flex items-center justify-center text-3xl shadow-sm transform hover:scale-110 transition-transform relative">
                      <span className="text-blue-500 font-bold">G</span>
                      <div className="absolute -top-2 -right-2 bg-green-500 text-white p-1 rounded-full border-2 border-white">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-semibold border border-green-100">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      Syncing Reviews
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-1/2 order-1 md:order-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 text-blue-600 font-bold text-xl mb-6">1</div>
                <Text variant="h2" className="text-3xl mb-4 text-gray-900">Connect Google</Text>
                <Text variant="body" className="text-lg leading-relaxed">
                  Securely connect your Google Business Profile in just one click. We import your locations and reviews instantly, keeping everything in sync.
                </Text>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24">
              <div className="w-full md:w-1/2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-100 text-purple-600 font-bold text-xl mb-6">2</div>
                <Text variant="h2" className="text-3xl mb-4 text-gray-900">Set Smart Rules</Text>
                <Text variant="body" className="text-lg leading-relaxed">
                  You decide how to respond. Set up rules based on star ratings—thank 5-star customers warmly, and offer support to those who had a bad experience.
                </Text>
              </div>
              <div className="w-full md:w-1/2 relative">
                <div className="absolute inset-0 bg-gradient-to-tl from-green-100 to-blue-100 rounded-3xl transform rotate-3 scale-105 opacity-50"></div>
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 relative">
                  {/* Illustration: Rules */}
                  <div className="space-y-4">
                    {/* Rule Card 1 */}
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4 transition-transform hover:scale-[1.02]">
                      <div className="flex flex-col items-center gap-1 min-w-[60px]">
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(i => <svg key={i} className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
                        </div>
                        <span className="text-[10px] font-bold text-gray-400">5 STARS</span>
                      </div>
                      <div className="h-8 w-px bg-gray-200"></div>
                      <div className="flex-1 bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex gap-2 items-center">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span className="text-xs font-medium text-gray-600">{`"Thanks for the love! We appreciate..."`}</span>
                        </div>
                      </div>
                    </div>

                    {/* Rule Card 2 */}
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4 opacity-75">
                      <div className="flex flex-col items-center gap-1 min-w-[60px]">
                        <div className="flex gap-0.5">
                          {[1,2].map(i => <svg key={i} className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
                          {[3,4,5].map(i => <svg key={i} className="w-3 h-3 text-gray-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
                        </div>
                        <span className="text-[10px] font-bold text-gray-400">1-2 STARS</span>
                      </div>
                      <div className="h-8 w-px bg-gray-200"></div>
                      <div className="flex-1 bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex gap-2 items-center">
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          <span className="text-xs font-medium text-gray-600">{`"We apologize for the..."`}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24">
              <div className="w-full md:w-1/2 order-2 md:order-1 relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-100 to-pink-100 rounded-3xl transform -rotate-3 scale-105 opacity-50"></div>
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 relative overflow-hidden">
                  {/* Illustration: Relax */}
                  <div className="space-y-4 relative z-10">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={`flex gap-4 items-start ${i === 3 ? 'opacity-50' : ''}`}>
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center text-lg">
                           {i === 1 ? '👩' : i === 2 ? '👨' : '🧑'}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                             <div className="h-2.5 w-24 bg-gray-200 rounded-full"></div>
                             <div className="flex">
                               {[1,2,3,4,5].map(s => <div key={s} className="w-2 h-2 rounded-full bg-yellow-400 mr-0.5"></div>)}
                             </div>
                          </div>
                          <div className="p-3 bg-blue-50 rounded-2xl rounded-tl-none text-xs text-blue-800 font-medium border border-blue-100">
                             Replying automatically using AI... ⚡️
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Status Badge */}
                  <div className="absolute bottom-6 right-6 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                    ACTIVE
                  </div>
                </div>
              </div>
              <div className="w-full md:w-1/2 order-1 md:order-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-green-100 text-green-600 font-bold text-xl mb-6">3</div>
                <Text variant="h2" className="text-3xl mb-4 text-gray-900">Relax & Watch It Grow</Text>
                <Text variant="body" className="text-lg leading-relaxed">
                  Respondly works 24/7. Watch your response rate climb to 100% and your local SEO improve, all while you focus on running your business.
                </Text>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Text variant="h2" className="text-3xl md:text-4xl mb-4">Simple, transparent pricing</Text>
            <Text variant="body" className="max-w-2xl mx-auto text-lg">
              Choose the plan that best fits your business needs.
            </Text>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Starter Plan */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 flex flex-col hover:shadow-xl transition-shadow relative overflow-hidden">
              <div className="mb-8">
                <Text variant="h2" className="text-2xl mb-2">Starter</Text>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900">$9.99</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <Text variant="body" className="mt-4 text-gray-600">
                  Perfect for small businesses getting started with review automation.
                </Text>
              </div>
              
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  <span className="text-gray-600">Template-based responses</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  <span className="text-gray-600">Smart auto-reply rules</span>
                </li>
                 <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  <span className="text-gray-600">Unlimited reviews</span>
                </li>
              </ul>

              <Link href="/register?plan=starter">
                <Button variant="outline" className="w-full">
                  Get Started
                </Button>
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-blue-500 flex flex-col hover:shadow-2xl transition-shadow relative overflow-hidden">
               <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                RECOMMENDED
              </div>
              <div className="mb-8">
                <Text variant="h2" className="text-2xl mb-2">Pro</Text>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900">$19.99</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <Text variant="body" className="mt-4 text-gray-600">
                  Harness the power of AI to write personalized responses for you.
                </Text>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-blue-100 rounded-full">
                    <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <span className="text-gray-900 font-medium">Everything in Standard, plus:</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  <span className="text-gray-600">AI Response Generation</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  <span className="text-gray-600">Review Sentiment Analysis</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  <span className="text-gray-600">Priority Support</span>
                </li>
              </ul>

              <Link href="/register?plan=pro">
                <Button className="w-full">
                  Get Started with AI
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-900 py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to automate your reviews?
          </h2>
          <p className="text-xl text-gray-400 mb-10">
            Join thousands of businesses saving time and improving their local SEO with Respondly.
          </p>
          <Link href="/register">
            <Button className="w-full sm:!w-auto px-8 py-4 text-lg bg-white text-gray-900 hover:bg-gray-100 border-none">
              Get Started Now
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <span className="text-xl font-bold text-gray-900">Respondly</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500 mb-4 md:mb-0">
            <Link href="/terms" className="hover:text-gray-900 transition-colors">
              Terms & Conditions
            </Link>
          </div>
          <div className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Respondly. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
