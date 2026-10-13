import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { useRoute } from './lib/router';
import { useStore } from './lib/store';
import { Home } from './views/Home';
import { Finder } from './views/Finder';
import { SuggestionView } from './views/SuggestionView';
import { SessionView } from './views/SessionView';
import { Sketchbook } from './views/Sketchbook';
import { Explore } from './views/Explore';
import { Settings } from './views/Settings';

const TITLES: Record<string, string> = {
  find: 'Find a sketch',
  idea: 'Your sketch idea',
  session: 'Sketching',
  sketchbook: 'My Sketchbook',
  explore: 'Explore ideas',
  settings: 'Settings',
};

export function App() {
  const route = useRoute();
  const { prefs } = useStore();
  const [section, sub] = route.segments;

  // Apply the theme preference to <html>.
  useEffect(() => {
    const root = document.documentElement;
    if (prefs.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', prefs.theme);
  }, [prefs.theme]);

  useEffect(() => {
    document.title = section && TITLES[section] ? `${TITLES[section]} · Quiet Corners Studio` : 'Quiet Corners Studio';
    if (section !== 'idea') window.scrollTo({ top: 0 });
  }, [section, sub]);

  let view;
  switch (section) {
    case undefined:
      view = <Home />;
      break;
    case 'find':
      view = <Finder />;
      break;
    case 'idea':
      view = <SuggestionView />;
      break;
    case 'session':
      view = <SessionView />;
      break;
    case 'sketchbook':
      view = <Sketchbook tab={sub} />;
      break;
    case 'explore':
      view = <Explore key={route.query.get('medium') ?? ''} initialMedium={route.query.get('medium')} />;
      break;
    case 'settings':
      view = <Settings />;
      break;
    default:
      view = (
        <div className="page-narrow empty">
          <h1>That page isn’t here</h1>
          <p>
            <a href="#/">Return home</a>
          </p>
        </div>
      );
  }

  return <Layout route={route}>{view}</Layout>;
}
