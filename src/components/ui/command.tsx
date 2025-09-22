import * as React from "react";

type CommandProps = React.ComponentPropsWithoutRef<"div"> & {
  children?: React.ReactNode;
};

export const Command = React.forwardRef<HTMLDivElement, CommandProps>(
  function Command(props, ref) {
    const { children, ...rest } = props;
    return (
      <div ref={ref} {...rest} role="group" aria-label="command">
        {children}
      </div>
    );
  }
);

Command.displayName = "Command";
