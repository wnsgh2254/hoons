export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F4F4F4] pt-32 pb-32 text-black">
  
      {/* Content Section */}
      <div className="px-6 md:px-12">
        <div className="max-w-4xl mx-auto space-y-16">
            
          {/* Title integrated into body */}
          <div>
            <h1 className="font-display font-normal text-4xl md:text-7xl uppercase tracking-tighter leading-[0.9] mb-12">
              Privacy<br />Policy
            </h1>
            {/* Changed from w-24 to w-full */}
            <div className="w-full h-[1px] bg-black mb-12"></div>
          </div>

          {/* Intro */}
          <section className="space-y-6 text-sm md:text-base font-normal leading-relaxed">
            <p>
              HOONS is committed to providing quality services to our clients and respecting your privacy.
            </p>
            <p>
              This Privacy Policy outlines how we collect, use, disclose, store, and protect your personal information in accordance with the <strong>Privacy Act 1988 (Cth)</strong> and the <strong>Australian Privacy Principles (APPs)</strong>.
            </p>
            <p>
              A copy of the Australian Privacy Principles is available from the Office of the Australian Information Commissioner (OAIC):<br/>
              <a href="https://www.oaic.gov.au/" target="_blank" rel="noreferrer" className="underline hover:text-gray-600 transition-colors">
                https://www.oaic.gov.au/
              </a>
            </p>
          </section>

          {/* Section 1 */}
          <section className="border-t border-black pt-8">
            <h2 className="font-display text-2xl md:text-3xl uppercase tracking-tighter mb-6">1. What is Personal Information and why do we collect it?</h2>
            <div className="space-y-4 text-sm md:text-base font-normal leading-relaxed">
              <p>Personal Information is information or an opinion that identifies an individual.</p>
              <p>The types of Personal Information we may collect include, but are not limited to:</p>
              <ul className="list-disc list-inside pl-4 space-y-1 marker:text-gray-400">
                <li>Name</li>
                <li>Email address</li>
                <li>Phone number</li>
                <li>Booking and service details</li>
              </ul>
              <p>This information is collected in various ways, including:</p>
              <ul className="list-disc list-inside pl-4 space-y-1 marker:text-gray-400">
                <li>In-person consultations</li>
                <li>Phone or email correspondence</li>
                <li>Online booking forms</li>
                <li>Our website</li>
                <li>Cookies and analytics tools</li>
              </ul>
              <p>We collect your Personal Information for the primary purpose of:</p>
              <ul className="list-disc list-inside pl-4 space-y-1 marker:text-gray-400">
                <li>Providing hair and beauty services</li>
                <li>Managing bookings and client relationships</li>
                <li>Communicating with you about appointments, services, or updates</li>
              </ul>
              <p>
                We may also use your information for secondary purposes closely related to the primary purpose, where you would reasonably expect such use.
                Where reasonable and practicable, we will explain why we are collecting your Personal Information and how it will be used.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="border-t border-black pt-8">
            <h2 className="font-display text-2xl md:text-3xl uppercase tracking-tighter mb-6">2. Sensitive Information</h2>
            <div className="space-y-4 text-sm md:text-base font-normal leading-relaxed">
              <p>Sensitive information includes information about an individual’s health or other matters defined under the Privacy Act.</p>
              <p>Any sensitive information collected by HOONS will be used only:</p>
              <ul className="list-disc list-inside pl-4 space-y-1 marker:text-gray-400">
                <li>For the primary purpose for which it was collected</li>
                <li>For a directly related secondary purpose</li>
                <li>With your consent</li>
                <li>Where required or authorised by law</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="border-t border-black pt-8">
            <h2 className="font-display text-2xl md:text-3xl uppercase tracking-tighter mb-6">3. Third Parties</h2>
            <div className="space-y-4 text-sm md:text-base font-normal leading-relaxed">
              <p>Where reasonable and practicable, we will collect Personal Information directly from you.</p>
              <p>In some cases, we may receive information from third parties (such as booking platforms or payment providers). When this occurs, we will take reasonable steps to ensure you are aware of the information provided to us.</p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="border-t border-black pt-8">
            <h2 className="font-display text-2xl md:text-3xl uppercase tracking-tighter mb-6">4. Disclosure of Personal Information</h2>
            <div className="space-y-4 text-sm md:text-base font-normal leading-relaxed">
              <p>Your Personal Information may be disclosed in the following circumstances:</p>
              <ul className="list-disc list-inside pl-4 space-y-1 marker:text-gray-400">
                <li>To third parties where you have consented</li>
                <li>Where required or authorised by Australian law</li>
              </ul>
              <p>We do not sell or rent your Personal Information to third parties.</p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="border-t border-black pt-8">
            <h2 className="font-display text-2xl md:text-3xl uppercase tracking-tighter mb-6">5. Security of Personal Information</h2>
            <div className="space-y-4 text-sm md:text-base font-normal leading-relaxed">
              <p>We take reasonable steps to protect your Personal Information from misuse, loss, unauthorised access, modification, or disclosure.</p>
              <p>When Personal Information is no longer required for the purpose for which it was collected, we will take reasonable steps to destroy or permanently de-identify it.</p>
              <p>Client records may be retained for a minimum period required by law or for business purposes.</p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="border-t border-black pt-8">
            <h2 className="font-display text-2xl md:text-3xl uppercase tracking-tighter mb-6">6. Access to and correction of your Personal Information</h2>
            <div className="space-y-4 text-sm md:text-base font-normal leading-relaxed">
              <p>You may request access to the Personal Information we hold about you, and request corrections if necessary, subject to certain legal exceptions.</p>
              <p>To request access or correction, please contact us in writing.</p>
              <p>We do not charge a fee for access requests but may charge a reasonable administrative fee for providing copies.</p>
              <p>For security reasons, we may require identification before releasing Personal Information.</p>
            </div>
          </section>

          {/* Section 7 */}
          <section className="border-t border-black pt-8">
            <h2 className="font-display text-2xl md:text-3xl uppercase tracking-tighter mb-6">7. Maintaining the quality of your Personal Information</h2>
            <div className="space-y-4 text-sm md:text-base font-normal leading-relaxed">
              <p>HOONS takes reasonable steps to ensure that the Personal Information we hold is accurate, complete, and up to date.</p>
              <p>If you believe any information we hold is incorrect or outdated, please contact us so we can update our records.</p>
            </div>
          </section>

          {/* Section 8 */}
          <section className="border-t border-black pt-8">
            <h2 className="font-display text-2xl md:text-3xl uppercase tracking-tighter mb-6">8. Policy updates</h2>
            <div className="space-y-4 text-sm md:text-base font-normal leading-relaxed">
              <p>This Privacy Policy may be updated from time to time.</p>
              <p>The latest version will always be available on our website.</p>
            </div>
          </section>

          {/* Section 9 */}
          <section className="border-t border-black pt-8">
            <h2 className="font-display text-2xl md:text-3xl uppercase tracking-tighter mb-6">9. Privacy policy enquiries and complaints</h2>
            <div className="space-y-4 text-sm md:text-base font-normal leading-relaxed">
              <p>If you have any questions, concerns, or complaints regarding this Privacy Policy or how we handle your Personal Information, please contact us at:</p>
              <p className="font-mono mt-4">Email: info@hoons.com</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
