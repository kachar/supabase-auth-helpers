import { CookieOptions } from '../types';
import type { NextApiRequest, NextApiResponse } from 'next';
import { setCookies } from '../../shared/utils/cookies';
import {
  NextRequestAdapter,
  NextResponseAdapter
} from '../../shared/adapters/NextAdapter';
import { COOKIE_OPTIONS } from '../../shared/utils/constants';

export interface HandleCallbackOptions {
  cookieOptions?: CookieOptions;
}

type AuthCookies = Parameters<typeof setCookies>[2];

export default function handelCallback(
  req: NextApiRequest,
  res: NextApiResponse,
  options: HandleCallbackOptions = {}
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
  const cookieOptions = { ...COOKIE_OPTIONS, ...options.cookieOptions };
  const { event, session } = req.body;

  if (!event) throw new Error('Auth event missing!');
  if (event === 'SIGNED_IN') {
    if (!session) throw new Error('Auth session missing!');
    setCookies(
      new NextRequestAdapter(req),
      new NextResponseAdapter(res),
      [
        { key: 'access-token', value: session.access_token },
        { key: 'refresh-token', value: session.refresh_token },
        session.provider_token
          ? { key: 'provider-token', value: session.provider_token }
          : null
      ].reduce<AuthCookies>((acc, token) => {
        if (token) {
          acc.push({
            name: `${cookieOptions.name}-${token.key}`,
            value: token.value,
            domain: cookieOptions.domain,
            maxAge: cookieOptions.lifetime ?? 0,
            path: cookieOptions.path,
            sameSite: cookieOptions.sameSite
          });
        }
        return acc;
      }, [])
    );
  }
  if (event === 'SIGNED_OUT') {
    setCookies(
      new NextRequestAdapter(req),
      new NextResponseAdapter(res),
      ['access-token', 'refresh-token', 'provider-token'].map((key) => ({
        name: `${cookieOptions.name}-${key}`,
        value: '',
        maxAge: -1
      }))
    );
  }
  res.status(200).json({});
}