// Exclusiones heredadas del análisis estático.
// Revisar cada regla durante la estabilización; estas exclusiones no acreditan
// que los permisos, la seguridad o la accesibilidad estén verificados.
const config = {
  rules: {
    "react-doctor/server-auth-actions": "off",
    "react-doctor/require-pnpm-hardening": "off",
    "react-doctor/no-danger": "off",
    "react-doctor/rendering-hydration-mismatch-time": "off",
    "react-doctor/no-derived-useState": "off",
    "react-doctor/no-initialize-state": "off",
    "react-doctor/no-event-handler": "off",
    "react-doctor/nextjs-no-redirect-in-try-catch": "off",
    "react-doctor/rendering-hydration-no-flicker": "off",
    "react-doctor/no-derived-state": "off",
    "react-doctor/no-pass-data-to-parent": "off",
    "react-doctor/no-array-index-as-key": "off",
    "react-doctor/server-sequential-independent-await": "off",
    "react-doctor/async-parallel": "off",
    "react-doctor/async-await-in-loop": "off",
    "react-doctor/jsx-no-jsx-as-prop": "off",
    "react-doctor/advanced-event-handler-refs": "off",
    "react-doctor/js-combine-iterations": "off",
    "react-doctor/js-index-maps": "off",
    "react-doctor/label-has-associated-control": "off",
    "react-doctor/only-export-components": "off",
    "react-doctor/no-multi-comp": "off",
    "react-doctor/no-many-boolean-props": "off",
    "react-doctor/no-giant-component": "off",
    "react-doctor/prefer-useReducer": "off",
    "react-doctor/exhaustive-deps": "off",
  },
};

export default config;
