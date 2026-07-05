import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { IntroScene } from './video_scenes/IntroScene';
import { ProfileScene } from './video_scenes/ProfileScene';
import { ConfirmScene } from './video_scenes/ConfirmScene';
import { DeletingScene } from './video_scenes/DeletingScene';
import { SignedOutScene } from './video_scenes/SignedOutScene';
import { OutroScene } from './video_scenes/OutroScene';

export const SCENE_DURATIONS = {
  intro: 2500,
  profile: 4000,
  confirm: 4500,
  deleting: 3000,
  signedOut: 4000,
  outro: 3000
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  intro: IntroScene,
  profile: ProfileScene,
  confirm: ConfirmScene,
  deleting: DeletingScene,
  signedOut: SignedOutScene,
  outro: OutroScene
};

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-50">
      {/* Persistent Background Layer */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <motion.div 
          className="absolute w-[60vw] h-[60vw] rounded-full blur-[100px] opacity-30"
          style={{ background: 'var(--color-primary)' }}
          animate={{
            x: sceneIndex >= 2 ? '-20vw' : '40vw',
            y: sceneIndex >= 4 ? '-20vh' : '20vh',
            scale: sceneIndex === 3 ? 1.2 : 1
          }}
          transition={{ duration: 4, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute w-[40vw] h-[40vw] rounded-full blur-[80px] opacity-20"
          style={{ background: 'var(--color-secondary)' }}
          animate={{
            x: sceneIndex >= 3 ? '60vw' : '-10vw',
            y: sceneIndex >= 1 ? '50vh' : '80vh',
          }}
          transition={{ duration: 5, ease: "easeInOut" }}
        />
        
        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
      </div>

      {/* Main content scenes */}
      <AnimatePresence mode="popLayout">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>
    </div>
  );
}
