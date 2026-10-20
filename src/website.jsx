import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowUpRight,
  ArrowRight,
  Menu,
  X,
  Radio,
  Mic2,
  Music2,
  BookOpen,
  MessageCircle,
  Headphones,
  Plus,
} from 'lucide-react';
import { Brand } from './components/ui.jsx';
import './styles/tokens.css';
import './styles/website.css';

const whatsapp = 'https://wa.me/919103147596';
const community = 'https://chat.whatsapp.com/DDdbmDEa5aHDv3q0wiqOOk';
const message = (text) => `${whatsapp}?text=${encodeURIComponent(text)}`;
const faqs = [
  [
    'What is Radio South City?',
    'An internet-based community radio station by, for and of the residents of South City. A place for our neighbours’ voices, creativity and stories to be heard.',
  ],
  [
    'Do I need to tune to a frequency?',
    'No radio frequency is needed. Radio South City is internet-based. Open the listener app from this website to see the available listening options.',
  ],
  [
    'What can I share, and in which language?',
    'Send songs, instrumental music, poetry, stories, travel experiences, recipes, achievements or motivational talks. We currently welcome content in Hindi and English. Political and religious discourses are not accepted.',
  ],
  [
    'How do I send my recording?',
    'Send your recording in MP3 format to 91031 47596 on WhatsApp. The team reviews submissions and arranges broadcasting slots. There is no age restriction or fixed time limit; a focused recording helps keep listeners engaged.',
  ],
  [
    'Can I advertise my local business?',
    'Yes. Message the team on WhatsApp at 91031 47596 to discuss advertising on the app, website and broadcast, including the available options and details.',
  ],
  [
    'Where can I find launch and event updates?',
    'Request to join the community WhatsApp group for the latest announcements. The original station announcement mentions a Diwali launch; a confirmed programme and event dates will be shared by the team.',
  ],
  [
    'How can I contact the team?',
    'WhatsApp 91031 47596 or email admin@radiosouthcity.com. Messages only, please — no calls.',
  ],
];
function External({ href, children, className = '' }) {
  return (
    <a href={href} className={className} target="_blank" rel="noreferrer">
      {children}
      <ArrowUpRight size={18} aria-hidden="true" />
    </a>
  );
}
function Website() {
  const [menu, setMenu] = useState(false);
  return (
    <>
      <a className="web-skip" href="#main">
        Skip to content
      </a>
      <header className="web-header">
        <a className="web-brand" href="#" aria-label="Radio South City home">
          <Brand />
        </a>
        <button
          className="web-menu"
          aria-label={menu ? 'Close navigation' : 'Open navigation'}
          aria-expanded={menu}
          aria-controls="web-nav"
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
        <nav
          id="web-nav"
          className={menu ? 'is-open' : ''}
          aria-label="Main navigation"
          onClick={() => setMenu(false)}
        >
          <a href="#about">Our story</a>
          <a href="#contribute">Be heard</a>
          <a href="#community">Community</a>
          <a href="#faq">FAQs</a>
          <a className="web-button web-button-small" href="/">
            Open listener <Headphones size={16} />
          </a>
        </nav>
      </header>
      <main id="main">
        <section className="web-hero web-wrap">
          <div className="web-hero-copy">
            <p className="web-eyebrow">
              <span className="web-dot" /> A COMMUNITY. A THOUSAND VOICES.
            </p>
            <h1>
              Your neighbourhood.
              <br />
              Your voice.
              <br />
              <em>Be heard.</em>
            </h1>
            <p className="web-lead">
              A little music. A familiar voice. A story from next door. Welcome to Radio South City
              — a radio station made by the people who call this place home.
            </p>
            <div className="web-actions">
              <a className="web-button" href="/">
                Explore the listener <ArrowUpRight size={19} />
              </a>
              <a className="web-text-link" href="#contribute">
                Share your voice <ArrowRight size={18} />
              </a>
            </div>
            <div className="web-hero-foot">
              <Radio size={20} />
              <span>By the residents. For the residents. Of South City.</span>
            </div>
          </div>
          <div className="web-hero-photo">
            <img
              src="/website/images/lnt-south-city-park.jpg"
              alt="L&T South City residential towers overlooking the landscaped park in Bengaluru"
              fetchPriority="high"
            />
            <div className="web-photo-caption">
              <span>THE PLACE WE CALL HOME</span>
              <a
                href="https://www.google.com/maps/search/?api=1&query=L%26T+South+City+Bengaluru"
                target="_blank"
                rel="noreferrer"
                aria-label="View L&T South City, Bengaluru on Google Maps"
              >
                Bengaluru ↗
              </a>
            </div>
            <div className="web-sticker">
              <Mic2 size={29} />
              <span>
                LOCAL VOICES.
                <br />
                SHARED STORIES.
              </span>
            </div>
          </div>
        </section>
        <div className="web-ribbon" aria-label="Music, stories, poetry and conversations">
          <span>MUSIC</span>
          <i>✳</i>
          <span>STORIES</span>
          <i>✳</i>
          <span>POETRY</span>
          <i>✳</i>
          <span>CONVERSATIONS</span>
          <i>✳</i>
          <span>OUR COMMUNITY</span>
        </div>
        <section id="about" className="web-wrap web-about web-section">
          <div className="web-story-heading">
            <p className="web-eyebrow">01 / OUR STORY</p>
            <h2>
              More than neighbours.
              <br />
              <em>A community on air.</em>
            </h2>
          </div>
          <div className="web-story-logo">
            <Brand variant="badge" />
          </div>
          <div>
            <p className="web-large-copy">Behind every door is a story worth sharing.</p>
            <p>
              Radio South City brings those stories together. The song you love to sing. The poem
              tucked away in your notebook. The journey you still talk about. This is a space for
              the people of South City to connect through sound.
            </p>
            <p>
              Created by residents, for residents, our internet radio makes room for familiar voices
              and fresh discoveries. All you need is a little curiosity — and something to share.
            </p>
            <a className="web-text-link" href="#contribute">
              There’s a place for your voice here <ArrowRight size={18} />
            </a>
          </div>
        </section>
        <section id="contribute" className="web-contribute">
          <div className="web-wrap web-section">
            <div className="web-section-heading">
              <div>
                <p className="web-eyebrow">02 / THE MIC IS YOURS</p>
                <h2>
                  What’s your <em>kind of radio?</em>
                </h2>
              </div>
              <p>
                You don’t have to be a professional.
                <br />
                You just have to be you.
              </p>
            </div>
            <div className="web-topics">
              {[
                [
                  Music2,
                  '01',
                  'A song, a little soul.',
                  'Sing a favourite, play an instrument, or share an original piece. Let the neighbourhood hear your music.',
                ],
                [
                  BookOpen,
                  '02',
                  'Stories that stay.',
                  'Poetry, storytelling, travel diaries, or a memory worth keeping. Bring us into your world.',
                ],
                [
                  MessageCircle,
                  '03',
                  'Everyday inspiration.',
                  'A family recipe, a personal milestone, a useful idea. Sometimes the everyday makes the best listening.',
                ],
              ].map(([Icon, number, title, copy]) => (
                <article key={number}>
                  <div className="web-topic-top">
                    <Icon size={29} />
                    <span>{number}</span>
                  </div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </article>
              ))}
            </div>
            <div className="web-submission">
              <div>
                <strong>Record. Send. Be heard.</strong>
                <p>
                  Share an MP3 in Hindi or English. Our team will review it and arrange a broadcast
                  slot. All ages welcome.
                </p>
              </div>
              <External
                href={message('Hello Radio South City! I would like to submit an MP3 recording.')}
                className="web-button"
              >
                Send your recording
              </External>
            </div>
            <p className="web-fine-print">
              A space for creativity and connection. Political and religious discourses are not
              accepted.
            </p>
          </div>
        </section>
        <section id="community" className="web-wrap web-section">
          <div className="web-section-heading">
            <div>
              <p className="web-eyebrow">03 / ROOTED RIGHT HERE</p>
              <h2>
                Our place. <em>Our people.</em>
              </h2>
            </div>
            <p>
              The familiar corners.
              <br />
              The extraordinary everyday.
            </p>
          </div>
          <div className="web-gallery">
            <figure>
              <img
                src="/website/images/lnt-south-city-towers.jpg"
                alt="An elevated view of L&T South City towers and flowering trees in Bengaluru"
                loading="lazy"
              />
              <figcaption>A thousand windows. A thousand stories.</figcaption>
            </figure>
            <figure>
              <img
                src="/website/images/south-city-pond.jpg"
                alt="Pink water lilies flowering on the neighbourhood pond"
                loading="lazy"
              />
              <figcaption>A moment of calm, close to home.</figcaption>
            </figure>
          </div>
          <p className="web-photo-credit">
            L&T South City, Bengaluru · Park and tower photographs:{' '}
            <a
              href="https://www.cgaei.com/projects/l%26t_south_city_bengaluru/l%26t_south_city_bengaluru.html"
              target="_blank"
              rel="noreferrer"
            >
              Carambiah &amp; George project archive
            </a>
            . Pond photograph courtesy of Sandhya Ashwin.
          </p>
          <div className="web-community-notes">
            <article>
              <span className="web-eyebrow">THE PEOPLE BEHIND THE SOUND</span>
              <h3>Made together.</h3>
              <p>
                Residents contribute the recordings, ideas and care that bring this station to life.
                Want to lend a hand? Introduce yourself to the team.
              </p>
              <External
                href={message('Hello! I would like to help with Radio South City.')}
                className="web-text-link"
              >
                Get involved
              </External>
            </article>
            <article>
              <span className="web-eyebrow">WITH OUR THANKS</span>
              <h3>Community supported.</h3>
              <p>
                Our thanks to <strong>Ujjwal Mukhopadhyay</strong>, listed among the station’s
                donors, and to everyone sharing their time and talent.
              </p>
              <External
                href={message('Hello! I would like to know how to support Radio South City.')}
                className="web-text-link"
              >
                Support the station
              </External>
            </article>
          </div>
        </section>
        <section className="web-updates web-wrap">
          <div className="web-updates-icon">
            <Radio size={42} />
          </div>
          <div>
            <p className="web-eyebrow">STAY IN THE LOOP</p>
            <h2>
              The next chapter <em>starts with us.</em>
            </h2>
            <p>
              Launch news, upcoming events and community announcements — hear about them from the
              team in our WhatsApp group.
            </p>
          </div>
          <External href={community} className="web-button">
            Join the community
          </External>
        </section>
        <section id="faq" className="web-wrap web-section web-faq">
          <div>
            <p className="web-eyebrow">04 / GOOD TO KNOW</p>
            <h2>
              A few things
              <br />
              <em>you might ask.</em>
            </h2>
            <p>Still curious? We’re a message away.</p>
            <External href={whatsapp} className="web-text-link">
              Message the team
            </External>
          </div>
          <div>
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <Plus size={20} aria-hidden="true" />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section id="contact" className="web-contact">
          <div className="web-wrap">
            <p className="web-eyebrow">LET’S MAKE SOME GOOD RADIO.</p>
            <h2>
              Have something to share?
              <br />
              <em>We’re all ears.</em>
            </h2>
            <div className="web-actions">
              <External href={whatsapp} className="web-button web-button-light">
                WhatsApp 91031 47596
              </External>
              <a href="mailto:admin@radiosouthcity.com" className="web-text-link">
                Email the team <ArrowUpRight size={18} />
              </a>
            </div>
            <p className="web-contact-note">
              Messages only, please. No calls.
              <br />
              For local business advertising, message us to discuss the options.
            </p>
          </div>
        </section>
      </main>
      <footer className="web-footer web-wrap">
        <a className="web-brand" href="#" aria-label="Radio South City home">
          <Brand />
        </a>
        <p>By, for & of the residents of South City.</p>
        <span>BE HEARD.</span>
      </footer>
    </>
  );
}
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Website />
  </React.StrictMode>,
);
