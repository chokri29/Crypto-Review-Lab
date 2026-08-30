/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { generateDualFaqJsonLd } from '../data/faqData';

interface FaqJsonLdProps {
  activeTab?: 'lab' | 'blog' | 'chat' | 'xstocks' | 'academy' | 'auditor' | 'orders' | 'f3';
}

/**
 * FaqJsonLd Component & Dynamic Hook
 * Inject and synchronize multi-topic JSON-LD FAQ schema entities for Google Rich Snippets
 * (Crypto Academy FAQs, Review Lab Audit FAQs, Prop Trading Evaluation Criteria, and AVF Engine Security Protocols)
 */
export default function FaqJsonLd({ activeTab }: FaqJsonLdProps) {
  useEffect(() => {
    const dualSchemaObj = generateDualFaqJsonLd(activeTab);
    const jsonString = JSON.stringify(dualSchemaObj, null, 2);

    let scriptElement = document.getElementById('faq-schema-jsonld') as HTMLScriptElement | null;

    if (!scriptElement) {
      scriptElement = document.createElement('script');
      scriptElement.id = 'faq-schema-jsonld';
      scriptElement.type = 'application/ld+json';
      document.head.appendChild(scriptElement);
    }

    scriptElement.textContent = jsonString;

    return () => {
      // Keep base schema intact or cleanup if necessary
    };
  }, [activeTab]);

  return null;
}
