"use client"

export const AdBanner = () => {
  return (
    <div 
      id="frame" 
      className="w-full mx-auto relative z-10 my-8"
      style={{ zIndex: 99998 }}
    >
      <iframe
        data-aa="2419216"
        src="//acceptable.a-ads.com/2419216/?size=Adaptive"
        style={{
          border: 0,
          padding: 0,
          width: "70%",
          height: "auto",
          overflow: "hidden",
          display: "block",
          margin: "auto",
        }}
        title="Advertisement"
        loading="lazy"
      />
    </div>
  )
}

