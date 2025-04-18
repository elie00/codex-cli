const theme = {
  styles: {
    container: () => ({
      flexDirection: "column",
    }),
    option: ({ isFocused }) => ({
      gap: 1,
      paddingLeft: isFocused ? 0 : 2,
    }),
    selectedIndicator: () => ({
      color: "green",
    }),
    focusIndicator: () => ({
      color: "green",
    }),
    label({ isFocused, isSelected }) {
      let color = "green";
      if (isSelected) {
        color = "greenBright";
      }
      if (isFocused) {
        color = "greenBright";
      }
      return { color };
    },
    highlightedText: () => ({
      bold: true,
    }),
  },
};
export const styles = theme.styles;
export default theme;
