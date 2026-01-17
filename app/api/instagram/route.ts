import { NextResponse } from 'next/server';

// Comment: Instagram API route for fetching posts
// 
// Instagram Graph API Integration Guide (2025):
// 
// IMPORTANT: Instagram Basic Display API was deprecated on December 4, 2024
// Only Instagram Graph API is available now (requires Business/Creator account)
// 
// Prerequisites:
// 1. Instagram account must be Business or Creator account
// 2. Instagram account must be connected to a Facebook Page
// 3. Meta Developer account and app created at https://developers.facebook.com/
// 4. Required permissions: instagram_basic, pages_show_list, business_management
// 5. App review may be required for certain permissions
//
// Setup Steps:
// 1. Convert Instagram account to Business/Creator account
// 2. Create or use existing Facebook Page and connect Instagram account
// 3. Create Meta App at https://developers.facebook.com/
// 4. Add "Instagram Graph API" product to your app
// 5. Request required permissions and go through app review if needed
// 6. Get Page Access Token via OAuth flow
// 7. Exchange short-lived token for long-lived token (60 days)
// 8. Get Instagram Business Account ID:
//    GET /{page-id}?fields=instagram_business_account&access_token={page-access-token}
// 9. Fetch posts:
//    GET /{instagram-business-account-id}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&access_token={page-access-token}
//
// Token Management:
// - Short-lived tokens expire quickly
// - Long-lived tokens last 60 days
// - Implement automatic token refresh logic
// - Consider using Meta's token exchange endpoint for renewal
//
// Environment Variables Needed:
// - INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_PAGE_ACCESS_TOKEN
// - INSTAGRAM_USER_ID or INSTAGRAM_BUSINESS_ACCOUNT_ID
//
// Example response structure:
// {
//   "data": [
//     {
//       "id": "123456789",
//       "caption": "Post caption...",
//       "media_type": "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM",
//       "media_url": "https://...",
//       "thumbnail_url": "https://...",
//       "permalink": "https://www.instagram.com/p/...",
//       "timestamp": "2024-01-01T00:00:00+0000"
//     }
//   ],
//   "paging": { ... }
// }

export async function GET() {
  try {
    // Comment: Check if Instagram credentials are configured
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || process.env.INSTAGRAM_PAGE_ACCESS_TOKEN;
    const userId = process.env.INSTAGRAM_USER_ID || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

    if (!accessToken || !userId) {
      // Comment: Return empty array if credentials not configured
      // This allows the frontend to work with mock data until Instagram is set up
      return NextResponse.json({ 
        data: [],
        message: 'Instagram API credentials not configured. Using mock data.'
      });
    }

    // Comment: Fetch Instagram posts using Instagram Graph API
    // Note: Use graph.facebook.com endpoint (not graph.instagram.com)
    // Uncomment and configure when ready to use real Instagram API
    /*
    const apiUrl = `https://graph.facebook.com/v21.0/${userId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&access_token=${accessToken}&limit=36`;
    
    const response = await fetch(apiUrl);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Instagram API error: ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    // Comment: Transform Instagram data to match frontend format
    const posts = (data.data || []).map((post: any) => ({
      id: post.id,
      title: post.caption?.substring(0, 50) || 'Instagram Post',
      category: post.media_type === 'IMAGE' ? 'Image' : post.media_type === 'VIDEO' ? 'Video' : 'Album',
      image: post.media_url || post.thumbnail_url,
      permalink: post.permalink,
      timestamp: post.timestamp,
    }));

    return NextResponse.json({ data: posts, paging: data.paging });
    */

    // Comment: Return empty for now - frontend will use mock data
    return NextResponse.json({ 
      data: [],
      message: 'Instagram API integration pending. Using mock data.'
    });
  } catch (error: any) {
    console.error('Error fetching Instagram posts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Instagram posts', data: [] },
      { status: 500 }
    );
  }
}
