export const motionTokens = {
  ease: [0.16, 1, 0.3, 1],
  softEase: [0.22, 1, 0.36, 1],
  duration: {
    micro: 0.14,
    interaction: 0.22,
    entrance: 0.42,
    hero: 0.68,
  },
  distance: {
    small: 10,
    medium: 18,
  },
};

export const revealUp = {
  hidden: { opacity: 0, y: motionTokens.distance.small },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: motionTokens.duration.entrance, ease: motionTokens.ease },
  },
};
