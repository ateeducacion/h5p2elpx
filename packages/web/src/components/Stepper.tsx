type StepProps = { n: string; label: string; active: boolean; done: boolean };

function Step({ n, label, active, done }: StepProps) {
  const cls = ["step", active ? "active" : "", done ? "done" : ""].filter(Boolean).join(" ");
  return (
    <li className={cls}>
      <span className="num">
        <span>{n}</span>
      </span>
      <span>{label}</span>
    </li>
  );
}

export type StepperState = {
  hasFiles: boolean;
  hasReport: boolean;
};

export function Stepper({ state }: { state: StepperState }) {
  const { hasFiles, hasReport } = state;
  return (
    <ol className="stepper">
      <Step n="1" label="Upload .h5p" active={!hasFiles} done={hasFiles} />
      <Step
        n="2"
        label="Review compatibility"
        active={hasFiles && !hasReport}
        done={hasFiles && hasReport}
      />
      <Step n="3" label="Configure options" active={hasFiles && !hasReport} done={hasReport} />
      <Step n="4" label="Download .elpx" active={hasReport} done={false} />
    </ol>
  );
}
