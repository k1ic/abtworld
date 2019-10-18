import useAsync from 'react-use/lib/useAsync';
import api from '../libs/api';

async function fetchPreviewPics() {
  try {
    const { status, data } = await api.get('/api/getpics?cmd=GetPicsForPreview0xbe863c4b03acb996e27b0c88875ff7c5e2c3090f');
    
    if (status === 400) {
    }
    
    return data;
  } catch (err) {
  }

  return {};
}

export async function fetchPayedPics(strAssetDid) {
  try {
    const { status, data } = await api.get(`/api/getpics?cmd=GetPicsForPayShow0x012bbc9ebd79c1898c6fc19cefef6d2ad7a82f44&asset_did=${strAssetDid}`);
    
    if (status === 400) {
    }
    
    return data;
  } catch (err) {
  }

  return {};
}

export default function usePreviewPics() {
  const state = useAsync(fetchPreviewPics);
  return state;
}
