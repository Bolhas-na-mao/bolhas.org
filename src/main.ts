import { BubbleScene } from './scene/BubbleScene';
import { PerformanceManager } from './utils/performance';
import './styles/main.css';

interface Project {
  title: string;
  slug: string;
  description: string;
  thumbnail: string;
}

class App {
  private scene?: BubbleScene;
  private performanceManager = PerformanceManager.getInstance();
  private animationId?: number;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    const canvas = document.getElementById(
      'bubble-canvas'
    ) as HTMLCanvasElement;

    if (
      !this.performanceManager.supportsWebGL2() &&
      !canvas.getContext('webgl')
    ) {
      this.showFallback();
      return;
    }

    try {
      this.scene = new BubbleScene(canvas);
      this.animate();

      await this.loadProjects();

      this.animateHero();
    } catch (error) {
      console.error('Failed to initialize scene:', error);
      this.showFallback();
    }
  }

  private showFallback(): void {
    const canvas = document.getElementById(
      'bubble-canvas'
    ) as HTMLCanvasElement;
    const fallback = document.getElementById('fallback') as HTMLElement;

    canvas.style.display = 'none';
    fallback.classList.remove('hidden');
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    this.scene?.update();
  };

  private async loadProjects(): Promise<void> {
    try {
      const response = await fetch('/projects.json');
      const projects: Project[] = await response.json();

      const projectsList = document.getElementById('projects-list');
      if (!projectsList) return;

      projects.forEach((project, index) => {
        const projectCard = document.createElement('div');
        projectCard.className = 'project-card';
        projectCard.style.setProperty('--delay', `${index * 0.1}s`);

        projectCard.innerHTML = `
          <h3>${project.title}</h3>
          <p>${project.description}</p>
          <a href="#${project.slug}" class="project-link">explorar →</a>
        `;

        projectsList.appendChild(projectCard);
      });
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }

  private animateHero(): void {
    const hero = document.querySelector('.hero');
    const projectsItems = document.querySelectorAll('.projects-item');
    const projectCards = document.querySelectorAll('.project-card');

    if (hero) {
      setTimeout(() => hero.classList.add('visible'), 100);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.2 }
    );

    projectsItems.forEach((item) => observer.observe(item));
    projectCards.forEach((card) => observer.observe(card));
  }

  dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.scene?.dispose();
  }
}

const app = new App();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    app.dispose();
  });
}
