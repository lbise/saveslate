import {
  MessageCircle,
  BookOpen,
  Keyboard,
  Tag,
  Target,
  Users,
  Upload,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

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

export function Help() {
  return (
    <div className="space-y-6 max-w-[1000px] mx-auto px-[18px] pt-[30px] pb-9 lg:px-8 lg:py-11 xl:px-10 xl:py-12">
      <PageHeader title="Help" />

      {/* Quick Links */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <a
            href="#faq"
            className="flex items-center gap-3 p-4 bg-card rounded-(--radius-md) transition-colors duration-150 hover:bg-secondary cursor-pointer no-underline"
          >
            <div className="w-9 h-9 bg-background rounded-(--radius-sm) flex items-center justify-center shrink-0">
              <BookOpen size={16} className="text-muted-foreground" />
            </div>
            <div>
              <div className="text-base font-medium text-foreground">FAQ</div>
              <div className="text-sm text-dimmed">Common questions answered</div>
            </div>
          </a>
          <a
            href="mailto:support@saveslate.ch"
            className="flex items-center gap-3 p-4 bg-card rounded-(--radius-md) transition-colors duration-150 hover:bg-secondary cursor-pointer no-underline"
          >
            <div className="w-9 h-9 bg-background rounded-(--radius-sm) flex items-center justify-center shrink-0">
              <MessageCircle size={16} className="text-muted-foreground" />
            </div>
            <div>
              <div className="text-base font-medium text-foreground">Contact Support</div>
              <div className="text-sm text-dimmed">We usually reply within 24h</div>
            </div>
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-base font-medium text-muted-foreground">Frequently Asked Questions</h2>
        </div>
        <Accordion type="single" collapsible>
          {FAQ_ITEMS.map((item) => (
            <AccordionItem key={item.question} value={item.question}>
              <AccordionTrigger className="gap-3 hover:no-underline group">
                <div className="w-8 h-8 bg-card rounded-(--radius-sm) flex items-center justify-center shrink-0 transition-colors duration-150 group-hover:bg-secondary">
                  <item.icon size={14} className="text-muted-foreground" />
                </div>
                <span className="flex-1 text-base font-medium text-foreground text-left">
                  {item.question}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-base text-muted-foreground leading-relaxed pl-11">
                  {item.answer}
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Footer */}
      <section className="pt-4">
        <div className="text-center">
          <div className="text-sm text-dimmed">
            Can&apos;t find what you need?
          </div>
          <a
            href="mailto:support@saveslate.ch"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-1 inline-block"
          >
            support@saveslate.ch
          </a>
        </div>
      </section>
    </div>
  );
}
