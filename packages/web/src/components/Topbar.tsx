/**
 * Top utility bar — eXeLearning brand on the left, GitHub link on the right.
 *
 * The brand mark renders the official "eX" logo from upstream
 * exelearning/exelearning/doc/logo-only.svg as a white SVG on a teal square.
 * All visual styling lives in styles.css (.topbar / .brand / .topbar-right).
 */
function ExeLogo() {
  return (
    <svg viewBox="60 0 230 224" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <title>eXeLearning</title>
      <path
        d="m102.249.584028c9.46 0 19.566 3.440102 30.316 10.320372 10.536 6.6652 25.049 18.4907 43.539 35.4763 31.821-26.661 48.795-32.6665 65.135-32.6665 10.536 0 19.566 2.9026 27.091 8.7078 13.863 10.6007 16.175 34.8103 6.463 50.7272-7.74 12.6855-17.846 26.3385-30.316 40.9588 28.381 32.251 44.233 55.457 44.233 71.368 0 11.395-3.548 20.103-10.643 26.123-7.31 6.02-16.448 9.03-27.413 9.03-16.556 0-42.514-12.562-74.55-39.438-18.275 16.125-32.681 27.306-43.216 33.541-10.751 6.235-20.964 9.353-30.639 9.353-12.9004 0-22.8983-4.193-29.9935-12.578-7.3103-8.601-10.9654-18.706-10.9654-30.316 0-7.526 1.075-14.083 3.2251-19.674 2.1501-5.59 6.1277-11.825 11.9329-18.705 5.8052-7.096 15.0506-16.878 27.7359-29.349-12.2553-12.47-21.2856-22.4682-27.0909-29.9934-6.0202-7.7403-10.1053-14.5131-12.2554-20.3183-2.3651-5.8052-3.5476-12.2554-3.5476-19.3507 0-7.5253 1.6125-14.513 4.8376-20.9632 3.2252-6.6653 7.9553-12.0405 14.1906-16.12565 6.2352-4.08515 13.5455-6.127721 21.9307-6.127722z"
        fill="currentColor"
      />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <title>GitHub</title>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.54-3.87-1.54-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.73-1.53-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.69.41.35.78 1.05.78 2.12v3.14c0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

export function Topbar({ githubUrl }: { githubUrl: string }) {
  return (
    <div className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <ExeLogo />
        </span>
        <span className="brand-name">h5p2elpx</span>
      </div>
      <div className="topbar-right">
        <a className="gh" href={githubUrl} target="_blank" rel="noopener noreferrer">
          <GithubIcon />
          View on GitHub
        </a>
      </div>
    </div>
  );
}
