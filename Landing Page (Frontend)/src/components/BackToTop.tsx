import { useEffect, useRef, useState } from 'react'

export default function BackToTop() {
    const [isVisible, setIsVisible] = useState(false)
    const pathRef = useRef<SVGPathElement>(null)

    useEffect(() => {
        const progressPath = pathRef.current
        if (!progressPath) return

        const pathLength = progressPath.getTotalLength()

        progressPath.style.transition = 'none'
        progressPath.style.strokeDasharray = `${pathLength} ${pathLength}`
        progressPath.style.strokeDashoffset = `${pathLength}`
        progressPath.getBoundingClientRect()
        progressPath.style.transition = 'stroke-dashoffset 10ms linear'

        const updateProgress = () => {
            const scroll = window.scrollY
            const height = document.documentElement.scrollHeight - window.innerHeight
            const progress = pathLength - (scroll * pathLength / height)
            progressPath.style.strokeDashoffset = `${progress}`
        }

        const handleScroll = () => {
            updateProgress()
            setIsVisible(window.scrollY > 200)
        }

        window.addEventListener('scroll', handleScroll)
        handleScroll()

        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const scrollToTop = (e: React.MouseEvent) => {
        e.preventDefault()
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    return (
        <div
            className={`progress-wrap ${isVisible ? 'active-progress' : ''}`}
            onClick={scrollToTop}
        >
            <svg className="progress-circle svg-content" width="100%" height="100%" viewBox="-1 -1 102 102">
                <path ref={pathRef} d="M50,1 a49,49 0 0,1 0,98 a49,49 0 0,1 0,-98" />
            </svg>
            <span className="arrow-icon">
                <i className="fas fa-arrow-up" />
            </span>
        </div>
    )
}
