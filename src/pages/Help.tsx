import { useState } from 'react';
import {
  MessageCircle,
  BookOpen,
  ChevronDown,
  Keyboard,
  Tag,
  Target,
  Users,
  Upload,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { cn } from '../lib/utils';

interface FaqItem {
  question: string;
  answer: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'How do tags work?',
    answer:
      'Tags replace traditional categories. Each transaction can have multiple tags, giving you flexible and detailed tracking. You can filter, search, and analyze spending by any combination of tags.',
    icon: Tag,
  },
  {
    question: 'How do I set up a savings goal?',
    answer:
      'Go to Goals and click "New Goal". Each goal automatically creates a linked tag. When you tag transactions with that tag, they count toward your goal progress.',
    icon: Target,
  },
  {
    question: 'How does expense splitting work?',
    answer:
      'When adding a transaction, toggle "Split" to divide it. Set your portion ratio (e.g., 50/50). The pending amount shows in your dashboard until the other person reimburses you.',
    icon: Users,
  },
  {
    question: 'Can I import transactions?',
    answer:
      'Yes! Click "Import" on the Dashboard or Transactions page. We support CSV files from most Swiss banks including UBS, Credit Suisse, PostFinance, and Raiffeisen.',
    icon: Upload,
  },
  {
    question: 'What keyboard shortcuts are available?',
    answer:
      'Press N to create a new transaction, G then D for Dashboard, G then T for Transactions, G then A for Accounts, and / to search. More shortcuts coming soon.',
    icon: Keyboard,
  },
];

function FaqAccordion({ item }: { item: FaqItem }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 w-full py-4 text-left bg-transparent border-none cursor-pointer group"
      >
        <div className="w-8 h-8 bg-surface rounded-(--radius-sm) flex items-center justify-center shrink-0 transition-colors duration-150 group-hover:bg-surface-hover">
          <item.icon size={14} className="text-text-secondary" />
        </div>
        <span className="flex-1 text-body font-medium text-text">
          {item.question}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            'text-text-muted transition-transform duration-200 shrink-0',
            isOpen && 'rotate-180',
          )}
        />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isOpen ? 'max-h-40 opacity-100 pb-4' : 'max-h-0 opacity-0',
        )}
      >
        <p className="text-body leading-relaxed pl-11">
          {item.answer}
        </p>
      </div>
    </div>
  );
}

export function Help() {
  return (
    <div className="page-container">
      <PageHeader title="Help" />

      {/* Quick Links */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <a
            href="#faq"
            className="flex items-center gap-3 p-4 bg-surface rounded-(--radius-md) transition-colors duration-150 hover:bg-surface-hover cursor-pointer no-underline"
          >
            <div className="w-9 h-9 bg-bg rounded-(--radius-sm) flex items-center justify-center shrink-0">
              <BookOpen size={16} className="text-text-secondary" />
            </div>
            <div>
              <div className="text-body font-medium text-text">FAQ</div>
              <div className="text-ui text-text-muted">Common questions answered</div>
            </div>
          </a>
          <a
            href="mailto:support@melomoney.ch"
            className="flex items-center gap-3 p-4 bg-surface rounded-(--radius-md) transition-colors duration-150 hover:bg-surface-hover cursor-pointer no-underline"
          >
            <div className="w-9 h-9 bg-bg rounded-(--radius-sm) flex items-center justify-center shrink-0">
              <MessageCircle size={16} className="text-text-secondary" />
            </div>
            <div>
              <div className="text-body font-medium text-text">Contact Support</div>
              <div className="text-ui text-text-muted">We usually reply within 24h</div>
            </div>
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq">
        <div className="section-header">
          <h2 className="section-title">Frequently Asked Questions</h2>
        </div>
        <div className="flex flex-col">
          {FAQ_ITEMS.map((item) => (
            <FaqAccordion key={item.question} item={item} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <section className="pt-4">
        <div className="text-center">
          <div className="text-ui text-text-muted">
            Can&apos;t find what you need?
          </div>
          <a
            href="mailto:support@melomoney.ch"
            className="text-ui hover:text-text transition-colors mt-1 inline-block"
          >
            support@melomoney.ch
          </a>
        </div>
      </section>
    </div>
  );
}
