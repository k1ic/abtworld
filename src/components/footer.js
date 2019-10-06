import React from 'react';
import Grid from '@material-ui/core/Grid';
import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';

export default function Footer() {
  const footers = [
    {
      title: 'ArcBlock',
      items: [
        {
          title: '官网',
          link: 'https://www.arcblockio.cn/zh/',
        },
        {
          title: 'ABT链网',
          link: 'https://www.abtnetwork.io/',
        },
        {
          title: 'ABT钱包',
          link: 'https://abtwallet.io/',
        },
        {
          title: 'Github',
          link: 'https://github.com/ArcBlock/',
        },
      ],
    },
    {
      title: '生态伙伴',
      items: [
        { 
          title: '引力波互动', 
          link: 'http://www.gravitywavegame.com/' 
        },
        {
          title: '华泰证券',
          link: 'https://www.htsc.com.cn/',
        },
        {
          title: '无涯社区',
          link: '/',
        },
        {
          title: '熵湾科技',
          link: '/',
        },
        {
          title: '白鹭科技',
          link: 'http://egretia.io/',
        },
      ],
    },
    {
      title: '社区',
      items: [
        {
          title: 'ABT共识社区',
          link: 'https://mp.weixin.qq.com/s/j173J-e_MtnquX7sZPDf7w',
        },
        { 
          title: 'ABT世界', 
          link: '/',
        },
        { 
          title: '币乎 - 1',  
          link: 'https://bihu.com/people/48746',
        },
      ],
    },
    {
      title: '广告',
      items: [
        {
          title: '大地云仓',
          link: 'http://www.dadiyuncang.com/wap/open/app.html#/cloud/invite?id=11826',
        },
      ],
    },
  ];

  return (
    <div style={{ marginTop: '40px', paddingTop: '40px', borderTop: '1px solid #DEDEDE' }}>
      <Container>
        <Grid container spacing={4}>
          {footers.map(x => (
            <Grid item xs={12} sm={6} md={3} key={x.title}>
              <Typography variant="h6" color="textPrimary" gutterBottom>
                {x.title}
              </Typography>
              <ul style={{ padding: '0 0 0 16px' }}>
                {x.items.map(item => (
                  <li key={item.title}>
                    <Typography
                      component="a"
                      href={item.link}
                      variant="subtitle1"
                      color="textSecondary"
                      target="_blank">
                      {item.title}
                    </Typography>
                  </li>
                ))}
              </ul>
            </Grid>
          ))}
        </Grid>
      </Container>
    </div>
  );
}
