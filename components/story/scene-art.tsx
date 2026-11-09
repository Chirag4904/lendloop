export function SceneArt() {
  return (
    <>
      <div className="story-orbit" aria-hidden="true">
        <span>AN EVERYDAY OBJECT. ANOTHER POSSIBILITY.</span>
      </div>
      <div className="scene-layer forgotten-art" aria-hidden="true">
        <span className="shelf-label">01 / THE WAITING ROOM</span>
        <div className="story-shelf" />
        <span className="object-caption">
          A little less shelf life.
          <br />A little more real life.
        </span>
      </div>
      <div className="scene-layer neighborhood-art" aria-hidden="true">
        <div className="apartment apartment-owner">
          <span>THE OWNER</span>
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="apartment apartment-neighbor">
          <span>THE NEIGHBOR</span>
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="search-demo">
          ⌕ &nbsp; A drill, close to home <b>Found nearby ↗</b>
        </div>
      </div>
      <div className="scene-layer request-art">
        <div className="story-listing">
          <span className="mini-label">ILLUSTRATIVE LISTING</span>
          <strong>Cordless drill</strong>
          <span>Power Tools · Free to borrow</span>
          <div className="listing-space" />
          <div className="demo-dates">
            Choose dates <b>Sat → Sun</b>
          </div>
          <div className="demo-approved">
            ✓ Owner approved · Agreement confirmed
          </div>
        </div>
      </div>
      <div className="scene-layer handover-art" aria-hidden="true">
        <svg viewBox="0 0 600 500">
          <path
            d="M110 285C150 65 450 65 490 285"
            stroke="#D9F36A"
            strokeWidth="2"
            strokeDasharray="5 9"
            fill="none"
          />
          <path
            d="M60 350V260L130 205L200 260V350ZM400 350V260L470 205L540 260V350Z"
            stroke="#8A9B9C"
            strokeWidth="2"
            fill="#203C49"
          />
        </svg>
        <span className="home-label owner-label">YOUR HOME</span>
        <span className="home-label borrower-label">THEIR NEXT PROJECT</span>
      </div>
      <div className="scene-layer loop-art" aria-hidden="true">
        <svg viewBox="0 0 600 500">
          <ellipse
            cx="300"
            cy="250"
            rx="220"
            ry="160"
            stroke="#D9F36A"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="m467 127 19 6-5-20M115 370l-3-22 22 4"
            stroke="#D9F36A"
            strokeWidth="3"
          />
        </svg>
        <span>BORROW. USE. RETURN. REPEAT.</span>
      </div>
    </>
  );
}
