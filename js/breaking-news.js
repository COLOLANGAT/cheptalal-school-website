function getLocalBreakingNewsItem() {
  const items = JSON.parse(localStorage.getItem('breakingNewsItems') || '[]');
  const currentId = localStorage.getItem('breakingNewsCurrentId');
  if (!items.length) return null;
  const active = items.find(item => item.id === currentId && item.status === 'active');
  if (active) return active;
  return items.find(item => item.status === 'active') || null;
}

function renderBreakingNewsBanner(item) {
  const banner = document.getElementById('breakingNewsBanner');
  const placeholder = document.getElementById('breakingNewsPlaceholder');
  const imageContainer = document.querySelector('#breakingNewsBanner .breaking-news-image');
  const title = document.getElementById('breakingNewsTitle');
  const dateLabel = document.getElementById('breakingNewsDate');
  const levelLabel = document.getElementById('breakingNewsLevel');
  const uniformLabel = document.getElementById('breakingNewsUniform');
  const description = document.getElementById('breakingNewsDescription');
  const typeBadge = document.getElementById('breakingNewsType');
  const detailBox = document.getElementById('breakingNewsDetails');

  if (!item) {
    banner.classList.remove('sports', 'kcse', 'general', 'empty');
    banner.classList.add('empty');
    placeholder.textContent = 'No current breaking news is available. Check back soon for the latest school achievement.';
    placeholder.style.display = 'block';
    detailBox.style.display = 'none';
    imageContainer.innerHTML = '<div class="breaking-news-empty">No breaking news image is available.</div>';
    return;
  }

  banner.classList.remove('sports', 'kcse', 'general', 'empty');
  banner.classList.add(item.type === 'kcse' ? 'kcse' : item.type === 'general' ? 'general' : 'sports');
  detailBox.style.display = 'grid';
  placeholder.style.display = 'none';

  // render all media in a responsive media grid
  if (item.media && item.media.length) {
    const grid = document.createElement('div');
    grid.className = 'media-grid';
    // if only one media, mark container for full-size
    if (item.media.length === 1) {
      imageContainer.classList.add('single');
    } else {
      imageContainer.classList.remove('single');
    }

    item.media.forEach(m => {
      const wrap = document.createElement('div');
      wrap.className = 'media-item';
      if (m.type === 'video') {
        const v = document.createElement('video');
        v.src = m.url;
        v.controls = true;
        v.muted = true;
        v.playsInline = true;
        v.loop = true;
        wrap.appendChild(v);
      } else {
        const img = document.createElement('img');
        img.src = m.url;
        img.alt = item.title || 'Breaking news image';
        wrap.appendChild(img);
      }
      grid.appendChild(wrap);
    });

    imageContainer.innerHTML = '';
    imageContainer.appendChild(grid);
  } else {
    // no media: reset to default
    imageContainer.classList.remove('single');
    imageContainer.innerHTML = '<img id="breakingNewsImage" src="PHOTOS/HOME PAGE PHOTOS/WhatsApp Image 2026-04-16 at 11.06.20 AM.jpeg" alt="Breaking news photo">';
  }

  title.textContent = item.title;
  dateLabel.textContent = item.date;
  levelLabel.textContent = item.location || item.level || '-';
  uniformLabel.textContent = item.uniform;
  description.textContent = item.description;
  typeBadge.textContent = item.type === 'kcse' ? 'RESULTS' : item.type === 'general' ? 'ALERT' : 'LIVE UPDATE';
}

function initBreakingNewsBanner() {
  const item = getLocalBreakingNewsItem();
  renderBreakingNewsBanner(item);
}

document.addEventListener('DOMContentLoaded', initBreakingNewsBanner);
