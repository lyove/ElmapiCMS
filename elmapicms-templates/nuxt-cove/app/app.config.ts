export default defineAppConfig({
  ui: {
    colors: {
      primary: 'lime',
      neutral: 'ink'
    },
    button: {
      slots: {
        base: 'rounded-full font-semibold'
      },
      defaultVariants: {
        color: 'primary'
      }
    },
    input: {
      slots: {
        base: 'rounded-xl'
      }
    },
    textarea: {
      slots: {
        base: 'rounded-xl'
      }
    }
  }
})
